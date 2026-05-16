"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Wind,
  Utensils,
  Brain,
  Heart,
  Bone,
  Zap,
  Thermometer,
  Eye,
  Ear,
  Activity,
  FlaskConical,
  Baby,
  ArrowRight,
  ChevronLeft,
} from "lucide-react";

import { api } from "@/lib/apiClient";
import { QuizQuestionCard } from "@/components/assessment/QuizQuestionCard";
import { QuizProgress } from "@/components/assessment/QuizProgress";
import { AssessmentResultCard } from "@/components/assessment/AssessmentResultCard";
import { RoleSidebar } from "@/components/layout/RoleSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Step = "category" | "quiz" | "result";

type DiseaseCategory = {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  accent: string;
};

const DISEASE_CATEGORIES: DiseaseCategory[] = [
  {
    id: "respiratory",
    label: "Breathing & Lungs",
    description: "Cough, shortness of breath, chest tightness, throat issues",
    icon: Wind,
    accent: "text-sky-500",
  },
  {
    id: "digestive",
    label: "Stomach & Digestion",
    description: "Nausea, bloating, stomach pain, bowel changes",
    icon: Utensils,
    accent: "text-amber-500",
  },
  {
    id: "neurological",
    label: "Head & Nerves",
    description: "Headaches, dizziness, memory issues, numbness or tingling",
    icon: Brain,
    accent: "text-violet-500",
  },
  {
    id: "cardiovascular",
    label: "Heart & Circulation",
    description: "Chest pain, palpitations, high blood pressure, fatigue",
    icon: Heart,
    accent: "text-rose-500",
  },
  {
    id: "musculoskeletal",
    label: "Muscles & Joints",
    description: "Joint pain, back pain, muscle aches, stiffness or swelling",
    icon: Bone,
    accent: "text-orange-500",
  },
  {
    id: "skin",
    label: "Skin & Hair",
    description: "Rashes, itching, unusual spots, hair or nail changes",
    icon: Zap,
    accent: "text-yellow-500",
  },
  {
    id: "infectious",
    label: "Fever & Infections",
    description: "High temperature, chills, body aches, viral or bacterial signs",
    icon: Thermometer,
    accent: "text-red-500",
  },
  {
    id: "eyes",
    label: "Eyes & Vision",
    description: "Blurred vision, eye pain, redness, sensitivity to light",
    icon: Eye,
    accent: "text-cyan-500",
  },
  {
    id: "ent",
    label: "Ear, Nose & Throat",
    description: "Ear pain, hearing changes, runny nose, sore throat",
    icon: Ear,
    accent: "text-teal-500",
  },
  {
    id: "endocrine",
    label: "Hormones & Metabolism",
    description: "Weight changes, fatigue, thyroid symptoms, blood sugar issues",
    icon: Activity,
    accent: "text-emerald-500",
  },
  {
    id: "urinary",
    label: "Kidney & Urinary",
    description: "Frequent urination, pain while urinating, kidney discomfort",
    icon: FlaskConical,
    accent: "text-blue-500",
  },
  {
    id: "general",
    label: "General & Other",
    description: "Not sure? Run a full-body check across all symptoms",
    icon: Baby,
    accent: "text-primary",
  },
];

type AssessmentResult = {
  id: number;
  predictedDisease: string;
  recommendedSpecialty: string;
  confidence: string;
  topPredictions: Array<{ disease: string; confidence: number }>;
  reasoning: string;
  llmAdvice: {
    overview: string;
    medications: string[];
    selfCare: string[];
    warningSigns: string[];
    disclaimer: string;
    source?: string;
  } | null;
  selectedSymptoms: string[];
  createdAt: string;
};

type QuizSymptom = {
  id: string;
  symptomKey: string;
  text: string;
  section?: string;
};

export default function AssessmentPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("category");
  const [selectedCategory, setSelectedCategory] =
    useState<DiseaseCategory | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingNextQuestion, setIsLoadingNextQuestion] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizSymptom[]>([]);
  const [askedKeys, setAskedKeys] = useState<string[]>([]);
  const maxQuestions = 30;

  const currentQuestion = questions[currentIndex];
  const submitAssessment = useCallback(
    async (finalAnswers: Record<string, boolean>) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const res = await api.post<{ assessment: AssessmentResult }>(
          "/assessments",
          { answers: finalAnswers, category: selectedCategory?.id ?? "general" },
        );
        setResult(res.data.assessment);
        setStep("result");
        toast.success("Assessment complete", {
          description: "Your analysis result is ready.",
        });
      } catch (err) {
        const msg =
          (err as { response?: { data?: { error?: string } } }).response?.data
            ?.error ?? "Failed to submit assessment.";
        setError(msg);
        toast.error("Assessment failed", { description: msg });
      } finally {
        setIsSubmitting(false);
      }
    },
    [selectedCategory?.id],
  );

  const handleCategorySelect = (category: DiseaseCategory) => {
    void (async () => {
      setSelectedCategory(category);
      setCurrentIndex(0);
      setAnswers({});
      setAskedKeys([]);
      setQuestions([]);
      setError(null);
      setStep("quiz");
      setIsLoadingNextQuestion(true);
      try {
        const categoryRes = await api.get<{ symptoms: QuizSymptom[] }>(
          "/assessments/symptoms",
          {
            params: {
              category: category.id,
              asked: "",
              positive: "",
              limit: maxQuestions,
            },
          },
        );

        const baseQuestions = categoryRes.data.symptoms ?? [];
        if (baseQuestions.length >= maxQuestions) {
          setQuestions(baseQuestions.slice(0, maxQuestions));
          return;
        }

        const generalRes = await api.get<{ symptoms: QuizSymptom[] }>(
          "/assessments/symptoms",
          {
            params: {
              category: "general",
              asked: "",
              positive: "",
              limit: maxQuestions * 2,
            },
          },
        );

        const combined = [...baseQuestions];
        const seen = new Set(baseQuestions.map((q) => q.symptomKey));
        for (const candidate of generalRes.data.symptoms ?? []) {
          if (seen.has(candidate.symptomKey)) continue;
          combined.push(candidate);
          seen.add(candidate.symptomKey);
          if (combined.length >= maxQuestions) break;
        }

        if (combined.length === 0) {
          setError("Could not load symptom questions right now.");
          return;
        }

        setQuestions(combined.slice(0, maxQuestions));
      } catch {
        setError("Could not load symptom questions right now.");
      } finally {
        setIsLoadingNextQuestion(false);
      }
    })();
  };

  const handleAnswer = useCallback(
    (answer: boolean) => {
      void (async () => {
      if (!currentQuestion) return;
      const newAnswers = {
        ...answers,
        [currentQuestion.symptomKey]: answer,
      };
      setAnswers(newAnswers);

      const newAsked = [...askedKeys, currentQuestion.symptomKey];
      setAskedKeys(newAsked);

      const totalQuestions = Math.min(maxQuestions, questions.length || maxQuestions);
      if (newAsked.length >= totalQuestions) {
        submitAssessment(newAnswers);
        return;
      }

      setCurrentIndex((i) => i + 1);
      })();
    },
    [
      currentQuestion,
      answers,
      askedKeys,
      maxQuestions,
      questions.length,
      submitAssessment,
    ],
  );

  const handleBookDoctor = () => {
    router.push(
      `/dashboard/booking?specialty=${encodeURIComponent(result?.recommendedSpecialty ?? "general")}`,
    );
  };

  const handleLogout = async () => {
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ??
      "http://localhost:4000";
    try {
      await fetch(`${apiBase}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("accessToken");
      window.localStorage.removeItem("user");
    }
    router.push("/login");
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full flex-1 overflow-hidden">
      <RoleSidebar role="user" onLogout={handleLogout} />

      <main className="flex min-h-full flex-1 flex-col overflow-y-auto">
        {/* ── Category selection ─────────────────────────────────────── */}
        {step === "category" && (
          <>
            <header className="px-6 pb-6 pt-8 lg:px-8">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                What&apos;s been bothering you?
              </h1>
              <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">
                Choose the closest area to your symptoms. We&apos;ll guide you with a
                focused flow and recommend the right next step.
              </p>
            </header>

            <section className="px-6 pb-10 lg:px-8">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {DISEASE_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat)}
                      className={cn(
                        "group relative flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-5 text-left",
                        "shadow-xs transition-all duration-200",
                        "hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg bg-muted/60",
                          "transition-colors duration-200 group-hover:bg-muted",
                        )}
                      >
                        <Icon className={cn("h-5 w-5", cat.accent)} strokeWidth={1.75} />
                      </div>

                      <div className="flex-1">
                        <p className="text-sm font-semibold leading-snug text-card-foreground">
                          {cat.label}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {cat.description}
                        </p>
                      </div>

                      <ArrowRight
                        className={cn(
                          "absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40",
                          "transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary",
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* ── Quiz ───────────────────────────────────────────────────── */}
        {step === "quiz" && (
          <>
            <header className="px-6 pb-4 pt-8 lg:px-8">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-2 h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setStep("category")}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Back
                </Button>
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                {selectedCategory?.label ?? "Health assessment"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Answer each question honestly — there are no wrong answers.
              </p>
            </header>

            <section className="flex flex-1 flex-col gap-6 px-6 pb-8 lg:px-8">
              <QuizProgress
                current={Math.min(currentIndex + 1, questions.length || maxQuestions)}
                total={questions.length || maxQuestions}
              />
              {isLoadingNextQuestion && !currentQuestion ? (
                <Card className="max-w-xl border-border/70 bg-card/70">
                  <CardContent className="py-6">
                    <p className="text-xs text-muted-foreground">Loading your next question...</p>
                  </CardContent>
                </Card>
              ) : currentQuestion ? (
                <div className="max-w-xl">
                  <QuizQuestionCard
                    question={currentQuestion.text}
                    section={currentQuestion.section}
                    questionNumber={currentIndex + 1}
                    totalQuestions={questions.length || maxQuestions}
                    onAnswer={handleAnswer}
                    disabled={isSubmitting || isLoadingNextQuestion}
                  />
                </div>
              ) : null}
              {error && (
                <Card className="max-w-xl border-destructive/50 bg-destructive/5">
                  <CardHeader>
                    <CardTitle className="text-sm text-destructive">
                      Something went wrong
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-destructive">{error}</p>
                  </CardContent>
                </Card>
              )}
            </section>
          </>
        )}

        {/* ── Result ─────────────────────────────────────────────────── */}
        {step === "result" && result && (
          <>
            <header className="px-6 pb-4 pt-8 lg:px-8">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Your results
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Based on your responses, here&apos;s a clear summary and doctor direction.
              </p>
            </header>
            <section className="flex flex-1 flex-col gap-6 px-6 pb-8 lg:px-8">
              <AssessmentResultCard
                predictedDisease={result.predictedDisease}
                recommendedSpecialty={result.recommendedSpecialty}
                confidence={result.confidence}
                topPredictions={result.topPredictions ?? []}
                reasoning={result.reasoning}
                llmAdvice={result.llmAdvice}
                selectedSymptoms={result.selectedSymptoms}
                onBookDoctor={handleBookDoctor}
              />
              <Button
                variant="ghost"
                size="sm"
                className="w-fit gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setStep("category");
                  setResult(null);
                  setAnswers({});
                  setQuestions([]);
                  setAskedKeys([]);
                  setCurrentIndex(0);
                }}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Check another symptom area
              </Button>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
