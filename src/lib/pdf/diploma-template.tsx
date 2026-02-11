import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { DiplomaContent } from '@/types';

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: 'Helvetica',
    backgroundColor: '#fefce8',
    position: 'relative',
  },
  border: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    bottom: 20,
    border: '4 solid #ca8a04',
    borderRadius: 8,
  },
  innerBorder: {
    position: 'absolute',
    top: 28,
    left: 28,
    right: 28,
    bottom: 28,
    border: '2 solid #eab308',
    borderRadius: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  decorTop: {
    fontSize: 30,
    marginBottom: 20,
    color: '#ca8a04',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#78350f',
    textAlign: 'center',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 16,
    color: '#92400e',
    textAlign: 'center',
    marginBottom: 40,
    fontStyle: 'italic',
  },
  presentedTo: {
    fontSize: 12,
    color: '#78716c',
    textAlign: 'center',
    marginBottom: 10,
  },
  recipientName: {
    fontSize: 28,
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 40,
    borderBottom: '2 solid #ca8a04',
    paddingBottom: 10,
    paddingHorizontal: 40,
  },
  bodyText: {
    fontSize: 12,
    color: '#57534e',
    textAlign: 'center',
    lineHeight: 1.8,
    maxWidth: 400,
    marginBottom: 40,
  },
  footerText: {
    fontSize: 10,
    color: '#78716c',
    textAlign: 'center',
    marginTop: 'auto',
  },
  signatureLine: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 40,
    paddingHorizontal: 50,
  },
  signature: {
    alignItems: 'center',
  },
  signatureName: {
    borderTop: '1 solid #ca8a04',
    paddingTop: 8,
    paddingHorizontal: 30,
    fontSize: 10,
    color: '#78716c',
  },
  date: {
    fontSize: 10,
    color: '#78716c',
    marginTop: 20,
  },
  decorBottom: {
    fontSize: 30,
    marginTop: 20,
    color: '#ca8a04',
  },
  watermark: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    fontSize: 8,
    color: '#d4d4d4',
  },
});

interface DiplomaPDFProps {
  content: DiplomaContent;
  recipientName?: string;
  date?: string;
}

export function DiplomaPDF({ content, recipientName = '{name}', date }: DiplomaPDFProps) {
  const formattedDate = date || new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Replace {name} placeholder with actual name
  const bodyText = content.body_text.replace(/{name}/g, recipientName);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.border} />
        <View style={styles.innerBorder} />

        <View style={styles.content}>
          <Text style={styles.decorTop}>✦ ✦ ✦</Text>

          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.subtitle}>{content.subtitle}</Text>

          <Text style={styles.presentedTo}>This is proudly presented to</Text>
          <Text style={styles.recipientName}>{recipientName}</Text>

          <Text style={styles.bodyText}>{bodyText}</Text>

          <Text style={styles.date}>{formattedDate}</Text>

          <View style={styles.signatureLine}>
            <View style={styles.signature}>
              <Text style={styles.signatureName}>{content.footer_text}</Text>
            </View>
          </View>

          <Text style={styles.decorBottom}>✦ ✦ ✦</Text>
        </View>

        <Text style={styles.watermark}>Created with QuestBox</Text>
      </Page>
    </Document>
  );
}
