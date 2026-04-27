"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type QuizQuestionCardProps = {
  question: string;
  section?: string;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: boolean) => void;
  disabled?: boolean;
};

export function QuizQuestionCard({
  question,
  section,
  questionNumber,
  totalQuestions,
  onAnswer,
  disabled = false,
}: QuizQuestionCardProps) {
  return (
    <Card className="border-border/80 bg-card/90 shadow-xs transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <CardDescription className="text-xs">
          {section ? `${section} • ` : ""}
          Question {questionNumber} of {totalQuestions}
        </CardDescription>
        <CardTitle className="text-base font-semibold">{question}</CardTitle>
      </CardHeader>
      <CardContent className="flex gap-3">
        <Button
          variant="outline"
          size="lg"
          className="flex-1"
          onClick={() => onAnswer(true)}
          disabled={disabled}
        >
          Yes
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="flex-1"
          onClick={() => onAnswer(false)}
          disabled={disabled}
        >
          No
        </Button>
      </CardContent>
    </Card>
  );
}
