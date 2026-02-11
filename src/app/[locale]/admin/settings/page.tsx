'use client';

import { Card, CardContent, CardHeader, CardTitle, Input, Button } from '@/components/ui';

export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Settings</h1>

      <div className="max-w-2xl space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Site Name"
              defaultValue="QuestBox"
              disabled
              hint="Contact support to change"
            />
            <Input
              label="Support Email"
              type="email"
              defaultValue="support@questbox.io"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
              API keys are configured via environment variables. Update your .env.local file to change them.
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <div>
                  <p className="font-medium">OpenAI</p>
                  <p className="text-sm text-gray-500">GPT-4 for quiz generation</p>
                </div>
                <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                  Configured
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <div>
                  <p className="font-medium">Anthropic</p>
                  <p className="text-sm text-gray-500">Claude for treasure hunts</p>
                </div>
                <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                  Configured
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <div>
                  <p className="font-medium">Google AI</p>
                  <p className="text-sm text-gray-500">Gemini for diplomas</p>
                </div>
                <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                  Configured
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <div>
                  <p className="font-medium">Resend</p>
                  <p className="text-sm text-gray-500">Email delivery</p>
                </div>
                <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                  Configured
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Download Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Max Downloads Per Link"
              type="number"
              defaultValue="3"
            />
            <Input
              label="Download Link Expiry (hours)"
              type="number"
              defaultValue="24"
            />
            <Button>Save Settings</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
