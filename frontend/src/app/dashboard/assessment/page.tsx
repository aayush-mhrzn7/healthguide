"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { QUIZ_QUESTIONS } from "@/constants/quiz";
import { api } from "@/lib/apiClient";
import { QuizQuestionCard } from "@/components/assessment/QuizQuestionCard";
import { QuizProgress } from "@/components/assessment/QuizProgress";
import { AssessmentResultCard } from "@/components/assessment/AssessmentResultCard";
import { RoleSidebar } from "@/components/layout/RoleSidebar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AssessmentResult = {
  id: number;
  predictedDisease: string;
  recommendedSpecialty: string;
  confidence: string;
  topPredictions: Array<{ disease: string; confidence: number }>;
  reasoning: string;
  selectedSymptoms: string[];
  createdAt: string;
};

type QuizSymptom = {
  id: string;
  symptomKey: string;
  text: string;
};

export default function AssessmentPage() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizSymptom[]>(QUIZ_QUESTIONS);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const isComplete = result !== null;

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<{ symptoms: QuizSymptom[] }>(
          "/assessments/symptoms",
        );
        if (res.data.symptoms?.length) {
          setQuestions(res.data.symptoms);
        }
      } catch {
      }
    })();
  }, []);

  const submitAssessment = useCallback(
    async (finalAnswers: Record<string, boolean>) => {
      setIsSubmitting(true);
      setError(null);

      try {
        const res = await api.post<{ assessment: AssessmentResult }>(
          "/assessments",
          { answers: finalAnswers }
        );
        setResult(res.data.assessment);
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
    []
  );

  const handleAnswer = useCallback(
    (answer: boolean) => {
      if (!currentQuestion) return;

      const newAnswers = {
        ...answers,
        [currentQuestion.symptomKey]: answer,
      };
      setAnswers(newAnswers);

      if (isLastQuestion) {
        submitAssessment(newAnswers);
      } else {
        setCurrentIndex((i) => i + 1);
      }
    },
    [currentQuestion, answers, isLastQuestion, submitAssessment]
  );

  const handleBookDoctor = () => {
    router.push(
      `/dashboard/booking?specialty=${encodeURIComponent(result?.recommendedSpecialty ?? "general")}`
    );
  };

  const handleLogout = async () => {
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ??
      "http://localhost:8000";
    try {
      await fetch(`${apiBase}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
    }
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
        <header className="px-6 pb-4 pt-8 lg:px-8">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Health assessment
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Answer a few questions about your symptoms. We&apos;ll recommend a
            doctor based on your responses.
          </p>
        </header>

        <section className="flex flex-1 flex-col gap-6 px-6 pb-8 lg:px-8">
          {!isComplete ? (
            <>
              <QuizProgress current={currentIndex + 1} total={questions.length} />
              {currentQuestion && (
                <div className="max-w-xl">
                  <QuizQuestionCard
                    question={currentQuestion.text}
                    questionNumber={currentIndex + 1}
                    totalQuestions={questions.length}
                    onAnswer={handleAnswer}
                    disabled={isSubmitting}
                  />
                </div>
              )}
              {error && (
                <Card className="max-w-xl border-destructive/50 bg-destructive/5">
                  <CardHeader>
                    <CardTitle className="text-sm text-destructive">
                      Error
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-destructive">{error}</p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            result && (
              <div className="max-w-xl">
                <AssessmentResultCard
                  predictedDisease={result.predictedDisease}
                  recommendedSpecialty={result.recommendedSpecialty}
                  confidence={result.confidence}
                  topPredictions={result.topPredictions ?? []}
                  reasoning={result.reasoning}
                  selectedSymptoms={result.selectedSymptoms}
                  onBookDoctor={handleBookDoctor}
                />
              </div>
            )
          )}
        </section>
      </main>
    </div>
  );
}
