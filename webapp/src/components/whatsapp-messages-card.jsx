"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MessageSquareText,
  Megaphone,
  Users,
  UserCheck,
  Calendar,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const MAX_PREVIEW_CHARS = 200;

function toId(n) {
  if (typeof n === "number") return n;
  if (!n) return 0;
  const parsed = Number.parseInt(String(n), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function pickLatest(arr) {
  if (!arr?.length) return undefined;
  return [...arr].sort((a, b) => toId(b.message_id) - toId(a.message_id))[0];
}

export default function WhatsAppMessagesCard({
  customerType,
  data,
  className,
}) {
  const [open, setOpen] = useState(false);

  const normalizedCustomerType = (customerType || "").toUpperCase();

  const selected = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return undefined;

    const normalized = data.map((d) => ({
      ...d,
      customer_type: (d.customer_type || "").toUpperCase(),
    }));

    // Precedence: ALL > specific (ACTIVE/INACTIVE)
    const allLatest = pickLatest(
      normalized.filter((n) => n.customer_type === "ALL")
    );
    if (allLatest) return allLatest;

    const specificLatest = pickLatest(
      normalized.filter((n) => n.customer_type === normalizedCustomerType)
    );
    return specificLatest;
  }, [data, normalizedCustomerType]);

  if (!selected?.message) return null;

  const message = selected.message;
  const isLong = message.length > MAX_PREVIEW_CHARS;
  const preview = isLong
    ? message.slice(0, MAX_PREVIEW_CHARS).trimEnd() + "…"
    : message;

  const badge =
    selected.customer_type === "ALL"
      ? {
          label: "ALL",
          icon: Users,
          color: "bg-emerald-50 text-emerald-700 border-emerald-200",
        }
      : selected.customer_type === "ACTIVE"
      ? {
          label: "ACTIVE",
          icon: UserCheck,
          color: "bg-blue-50 text-blue-700 border-blue-200",
        }
      : {
          label: selected.customer_type || "INACTIVE",
          icon: Megaphone,
          color: "bg-amber-50 text-amber-700 border-amber-200",
        };

  const ActiveIcon = MessageSquareText;

  const formattedDate = selected.active_date
    ? new Date(selected.active_date).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(selected.message);
    } catch {
      // ignore
    }
  }

  return (
    <Card
      className={cn("border-l-4 sm:border-l-4 border-l-emerald-500", className)}
    >
      <CardHeader className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-emerald-100 text-emerald-700 p-2">
            <ActiveIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <CardTitle className="text-base sm:text-lg text-pretty">
                महत्वाची सूचना
              </CardTitle>
              {formattedDate ? (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="leading-none">
                    सूचना दिनांक: {formattedDate}
                  </span>
                </div>
              ) : null}
            </div>

            <div
              className={cn(
                "mt-1 inline-flex items-center gap-2 rounded-md border px-2 py-0.5 text-[11px] sm:text-xs",
                badge.color
              )}
            >
              {badge.icon ? (
                <badge.icon className="h-3.5 w-3.5" aria-hidden="true" />
              ) : null}
              <span className="font-medium tracking-wide">{badge.label}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4">
        <div className="text-md leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ node, ...props }) => <p className="mb-2" {...props} />,
              strong: ({ node, ...props }) => (
                <strong className="font-semibold" {...props} />
              ),
              em: ({ node, ...props }) => <em className="italic" {...props} />,
              ul: ({ node, ...props }) => (
                <ul className="list-disc pl-5 mb-2" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal pl-5 mb-2" {...props} />
              ),
              code: ({ node, inline, ...props }) =>
                inline ? (
                  <code
                    className="rounded bg-muted px-1 py-0.5 text-xs"
                    {...props}
                  />
                ) : (
                  <code
                    className="block rounded bg-muted p-2 text-xs"
                    {...props}
                  />
                ),
            }}
          >
            {preview}
          </ReactMarkdown>

          {isLong ? (
            <div className="mt-2">
              <Dialog open={open} onOpenChange={setOpen}>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setOpen(true)}
                  className="text-blue-600 hover:underline p-0 h-auto font-medium"
                >
                  संपूर्ण सूचना पहा
                </Button>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                      <MessageSquareText
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                      महत्वाची सूचना
                    </DialogTitle>
                  </DialogHeader>
                  <div className="mt-2 max-h-[60vh] overflow-auto text-md leading-relaxed">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ node, ...props }) => (
                          <p className="mb-2" {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong className="font-semibold" {...props} />
                        ),
                        em: ({ node, ...props }) => (
                          <em className="italic" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul className="list-disc pl-5 mb-2" {...props} />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol className="list-decimal pl-5 mb-2" {...props} />
                        ),
                        code: ({ node, inline, ...props }) =>
                          inline ? (
                            <code
                              className="rounded bg-muted px-1 py-0.5 text-xs"
                              {...props}
                            />
                          ) : (
                            <code
                              className="block rounded bg-muted p-2 text-xs"
                              {...props}
                            />
                          ),
                      }}
                    >
                      {message}
                    </ReactMarkdown>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
