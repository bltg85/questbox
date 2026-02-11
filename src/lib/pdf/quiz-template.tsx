import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { QuizContent } from '@/types';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#eff6ff',
  },
  header: {
    textAlign: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 5,
  },
  introduction: {
    fontSize: 11,
    lineHeight: 1.5,
    marginBottom: 25,
    padding: 12,
    backgroundColor: '#dbeafe',
    borderRadius: 6,
    color: '#1e3a8a',
  },
  questionContainer: {
    marginBottom: 18,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    border: '1 solid #bfdbfe',
  },
  questionHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  questionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    color: 'white',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 10,
  },
  questionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
  },
  optionsContainer: {
    marginLeft: 34,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  optionLetter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    border: '1 solid #cbd5e1',
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 10,
    marginRight: 8,
    color: '#475569',
  },
  optionText: {
    fontSize: 11,
    color: '#334155',
  },
  answerKey: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  answerKeyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 10,
  },
  answerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  answerItem: {
    fontSize: 10,
    color: '#78350f',
    marginRight: 15,
    marginBottom: 5,
  },
  scoringGuide: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
  },
  scoringTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 5,
  },
  scoringText: {
    fontSize: 10,
    color: '#64748b',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
  },
});

interface QuizPDFProps {
  content: QuizContent;
  showAnswers?: boolean;
}

export function QuizPDF({ content, showAnswers = false }: QuizPDFProps) {
  const optionLetters = ['A', 'B', 'C', 'D'];

  // Split questions into pages (4 questions per page)
  const questionsPerPage = 4;
  const pages: typeof content.questions[] = [];
  for (let i = 0; i < content.questions.length; i += questionsPerPage) {
    pages.push(content.questions.slice(i, i + questionsPerPage));
  }

  return (
    <Document>
      {/* Quiz Pages */}
      {pages.map((pageQuestions, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          {pageIndex === 0 && (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>{content.title}</Text>
                <Text style={styles.subtitle}>Quiz Challenge</Text>
              </View>

              <Text style={styles.introduction}>{content.introduction}</Text>
            </>
          )}

          {pageQuestions.map((question) => (
            <View key={question.number} style={styles.questionContainer}>
              <View style={styles.questionHeader}>
                <Text style={styles.questionNumber}>{question.number}</Text>
                <Text style={styles.questionText}>{question.question}</Text>
              </View>

              <View style={styles.optionsContainer}>
                {question.options.map((option, optIndex) => (
                  <View key={optIndex} style={styles.option}>
                    <Text style={styles.optionLetter}>{optionLetters[optIndex]}</Text>
                    <Text style={styles.optionText}>{option}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          <Text style={styles.footer}>Created with QuestBox • questbox.io</Text>
        </Page>
      ))}

      {/* Answer Key Page */}
      {showAnswers && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>Answer Key</Text>
          </View>

          <View style={styles.answerKey}>
            <Text style={styles.answerKeyTitle}>Correct Answers:</Text>
            <View style={styles.answerRow}>
              {content.questions.map((q) => (
                <Text key={q.number} style={styles.answerItem}>
                  {q.number}. {optionLetters[q.correct_answer]}
                </Text>
              ))}
            </View>
          </View>

          <View style={styles.scoringGuide}>
            <Text style={styles.scoringTitle}>Scoring Guide:</Text>
            <Text style={styles.scoringText}>{content.scoring_guide}</Text>
          </View>

          {/* Explanations */}
          {content.questions.some((q) => q.explanation) && (
            <View style={{ marginTop: 20 }}>
              <Text style={styles.answerKeyTitle}>Explanations:</Text>
              {content.questions
                .filter((q) => q.explanation)
                .map((q) => (
                  <View key={q.number} style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#475569' }}>
                      {q.number}. {q.explanation}
                    </Text>
                  </View>
                ))}
            </View>
          )}

          <Text style={styles.footer}>Created with QuestBox • questbox.io</Text>
        </Page>
      )}
    </Document>
  );
}
