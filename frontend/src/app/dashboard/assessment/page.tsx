"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  BadgeCheck,
  CalendarClock,
  HeartPulse,
  User2,
  Settings2,
  LogOut,
} from "lucide-react";

import { QUIZ_QUESTIONS } from "@/constants/quiz";
import { api } from "@/lib/apiClient";
import { QuizQuestionCard } from "@/components/assessment/QuizQuestionCard";
import { QuizProgress } from "@/components/assessment/QuizProgress";
import { AssessmentResultCard } from "@/components/assessment/AssessmentResultCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AssessmentResult = {
  id: number;
  predictedDisease: string;
  recommendedSpecialty: string;
  confidence: string;
  createdAt: string;
};

export default function AssessmentPage() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = QUIZ_QUESTIONS[currentIndex];
  const isLastQuestion = currentIndex === QUIZ_QUESTIONS.length - 1;
  const isComplete = result !== null;

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
      } catch (err) {
        const msg =
          (err as { response?: { data?: { error?: string } } }).response?.data
            ?.error ?? "Failed to submit assessment.";
        setError(msg);
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
    try {
      await fetch("http://localhost:8000/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    }
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("accessToken");
      window.localStorage.removeItem("user");
    }
    router.push("/login");
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full flex-1 overflow-hidden">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/80 md:flex">
        <Link href="/dashboard" className="flex items-center gap-3 px-6 py-6">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold leading-none">HealthGuide</p>
            <p className="text-xs text-muted-foreground">Health Assessment</p>
          </div>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 px-3 pb-4 text-sm">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <CalendarClock className="h-4 w-4" />
            <span>My assessments</span>
          </Link>
          <div className="flex items-center gap-3 rounded-lg border-l-4 border-primary bg-primary/10 px-3 py-2.5 text-primary">
            <BadgeCheck className="h-4 w-4" />
            <span>New assessment</span>
          </div>
          <Link
            href="/dashboard/appointments"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <BadgeCheck className="h-4 w-4" />
            <span>My appointments</span>
          </Link>
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <User2 className="h-4 w-4" />
            <span>Profile</span>
          </Link>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Settings2 className="h-4 w-4" />
            <span>Settings</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </button>
        </nav>
      </aside>

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
              <QuizProgress
                current={currentIndex + 1}
                total={QUIZ_QUESTIONS.length}
              />
              {currentQuestion && (
                <div className="max-w-xl">
                  <QuizQuestionCard
                    question={currentQuestion.text}
                    questionNumber={currentIndex + 1}
                    totalQuestions={QUIZ_QUESTIONS.length}
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
