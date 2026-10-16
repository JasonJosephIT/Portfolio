import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Placeholder for the RAG chatbot (phase F). It answers nothing yet; it shows where the chat will live. */
export default function ChatPlaceholder() {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed right-4 bottom-4 z-30 sm:right-6 sm:bottom-6">
      {open ? (
        <Card className="w-[min(22rem,calc(100vw-2rem))] gap-3 py-4 shadow-2xl shadow-black/60">
          <CardHeader className="flex flex-row items-start justify-between gap-2 px-4">
            <div className="grid gap-1">
              <CardTitle className="text-base">Ask about my work</CardTitle>
              <CardDescription>
                A chatbot that answers only from the public projects on this page, with citations. Coming in a later phase.
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" aria-label="Close" onClick={() => setOpen(false)}>
              <X />
            </Button>
          </CardHeader>
          <CardContent className="px-4">
            <div className="flex gap-2">
              <input
                disabled
                placeholder="e.g. What did Jason build on Cloudflare?"
                className="h-9 flex-1 rounded-sm border bg-muted px-3 text-sm text-muted-foreground placeholder:text-pencil"
              />
              <Button disabled>Ask</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setOpen(true)} className="rounded-full px-4 shadow-lg shadow-black/50" aria-label="Ask about my work (coming soon)">
          <MessageCircle /> Ask about my work
          <span className="rounded-sm bg-primary-foreground/15 px-1.5 text-[0.65rem] tracking-wider uppercase">soon</span>
        </Button>
      )}
    </div>
  );
}
