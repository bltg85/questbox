import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import type { TreasureHuntContent } from '@/types';

// Register a font (using default for now)
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#fefce8',
  },
  header: {
    textAlign: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#78716c',
  },
  introduction: {
    fontSize: 12,
    lineHeight: 1.6,
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  clueContainer: {
    marginBottom: 20,
  },
  clueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  clueNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f59e0b',
    color: 'white',
    textAlign: 'center',
    lineHeight: 30,
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 10,
  },
  clueTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#78350f',
  },
  riddleBox: {
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    border: '2 solid #fcd34d',
    marginBottom: 8,
  },
  riddleText: {
    fontSize: 12,
    lineHeight: 1.6,
    fontStyle: 'italic',
    color: '#44403c',
  },
  answerBox: {
    padding: 10,
    backgroundColor: '#fef3c7',
    borderRadius: 4,
    flexDirection: 'row',
  },
  answerLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#92400e',
    marginRight: 5,
  },
  answerText: {
    fontSize: 10,
    color: '#78350f',
  },
  finalMessage: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    textAlign: 'center',
  },
  finalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  finalText: {
    fontSize: 12,
    color: 'white',
    lineHeight: 1.5,
  },
  tipsSection: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#e7e5e4',
    borderRadius: 8,
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#44403c',
    marginBottom: 10,
  },
  tipItem: {
    fontSize: 10,
    color: '#57534e',
    marginBottom: 5,
    paddingLeft: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#a8a29e',
  },
});

interface TreasureHuntPDFProps {
  content: TreasureHuntContent;
}

export function TreasureHuntPDF({ content }: TreasureHuntPDFProps) {
  return (
    <Document>
      {/* Instructions Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.subtitle}>A Treasure Hunt Adventure</Text>
        </View>

        <Text style={styles.introduction}>{content.introduction}</Text>

        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Tips for Adults:</Text>
          {content.tips_for_adults.map((tip, index) => (
            <Text key={index} style={styles.tipItem}>
              • {tip}
            </Text>
          ))}
        </View>

        <Text style={styles.footer}>Created with QuestBox • questbox.io</Text>
      </Page>

      {/* Clues Pages */}
      {content.clues.map((clue, index) => (
        <Page key={index} size="A4" style={styles.page}>
          <View style={styles.clueContainer}>
            <View style={styles.clueHeader}>
              <Text style={styles.clueNumber}>{clue.number}</Text>
              <Text style={styles.clueTitle}>Clue #{clue.number}</Text>
            </View>

            <View style={styles.riddleBox}>
              <Text style={styles.riddleText}>{clue.riddle}</Text>
            </View>

            <View style={styles.answerBox}>
              <Text style={styles.answerLabel}>Location hint:</Text>
              <Text style={styles.answerText}>{clue.location_hint}</Text>
            </View>
          </View>

          {index === content.clues.length - 1 && (
            <View style={styles.finalMessage}>
              <Text style={styles.finalTitle}>Treasure Found!</Text>
              <Text style={styles.finalText}>{content.final_message}</Text>
            </View>
          )}

          <Text style={styles.footer}>Created with QuestBox • questbox.io</Text>
        </Page>
      ))}
    </Document>
  );
}
