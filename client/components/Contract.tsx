"use client";

import { useState, useCallback } from "react";
import {
  publishNews,
  getNews,
  totalNews,
  CONTRACT_ADDRESS,
} from "@/hooks/contract";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Spotlight } from "@/components/ui/spotlight";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Icons ────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function NewspaperIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8" />
      <path d="M15 18h-5" />
      <path d="M10 6h8v4h-8V6Z" />
    </svg>
  );
}

// ── Styled Input ─────────────────────────────────────────────

function Input({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">
        {label}
      </label>
      <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-px transition-all focus-within:border-[#7c6cf0]/30 focus-within:shadow-[0_0_20px_rgba(124,108,240,0.08)]">
        <input
          {...props}
          className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none"
        />
      </div>
    </div>
  );
}

// ── Method Signature ─────────────────────────────────────────

function MethodSignature({
  name,
  params,
  returns,
  color,
}: {
  name: string;
  params: string;
  returns?: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 font-mono text-sm">
      <span style={{ color }} className="font-semibold">fn</span>
      <span className="text-white/70">{name}</span>
      <span className="text-white/20 text-xs">{params}</span>
      {returns && (
        <span className="ml-auto text-white/15 text-[10px]">{returns}</span>
      )}
    </div>
  );
}



// ── Main Component ───────────────────────────────────────────

type Tab = "read" | "publish" | "stats";

interface ContractUIProps {
  walletAddress: string | null;
  onConnect: () => void;
  isConnecting: boolean;
}

export default function ContractUI({ walletAddress, onConnect, isConnecting }: ContractUIProps) {
  const [activeTab, setActiveTab] = useState<Tab>("read");
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  const [newsContent, setNewsContent] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const [readId, setReadId] = useState("");
  const [isReading, setIsReading] = useState(false);
  const [newsData, setNewsData] = useState<{ author: string; content: string } | null>(null);

  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handlePublishNews = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!newsContent.trim()) return setError("Enter news content");
    setError(null);
    setIsPublishing(true);
    setTxStatus("Awaiting signature...");
    try {
      await publishNews(walletAddress, newsContent.trim());
      setTxStatus("News published on-chain!");
      setNewsContent("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsPublishing(false);
    }
  }, [walletAddress, newsContent]);

  const handleReadNews = useCallback(async () => {
    const id = parseInt(readId.trim(), 10);
    if (isNaN(id) || id < 1) return setError("Enter a valid news ID");
    setError(null);
    setIsReading(true);
    setNewsData(null);
    try {
      const result = await getNews(id, walletAddress || undefined);
      if (result && Array.isArray(result) && result.length === 2) {
        setNewsData({ author: String(result[0]), content: String(result[1]) });
      } else {
        setError("News not found");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setIsReading(false);
    }
  }, [readId, walletAddress]);

  const handleGetTotal = useCallback(async () => {
    setError(null);
    setIsLoadingCount(true);
    setTotalCount(null);
    try {
      const count = await totalNews(walletAddress || undefined);
      setTotalCount(Number(count) || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setIsLoadingCount(false);
    }
  }, [walletAddress]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "read", label: "Read", icon: <SearchIcon />, color: "#4fc3f7" },
    { key: "publish", label: "Publish", icon: <PenIcon />, color: "#7c6cf0" },
    { key: "stats", label: "Stats", icon: <NewspaperIcon />, color: "#fbbf24" },
  ];

  return (
    <div className="w-full max-w-2xl animate-fade-in-up-delayed">
      {/* Toasts */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#f87171]/15 bg-[#f87171]/[0.05] px-4 py-3 backdrop-blur-sm animate-slide-down">
          <span className="mt-0.5 text-[#f87171]"><AlertIcon /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#f87171]/90">Error</p>
            <p className="text-xs text-[#f87171]/50 mt-0.5 break-all">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="shrink-0 text-[#f87171]/30 hover:text-[#f87171]/70 text-lg leading-none">&times;</button>
        </div>
      )}

      {txStatus && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#34d399]/15 bg-[#34d399]/[0.05] px-4 py-3 backdrop-blur-sm shadow-[0_0_30px_rgba(52,211,153,0.05)] animate-slide-down">
          <span className="text-[#34d399]">
            {txStatus.includes("on-chain") || txStatus.includes("published") ? <CheckIcon /> : <SpinnerIcon />}
          </span>
          <span className="text-sm text-[#34d399]/90">{txStatus}</span>
        </div>
      )}

      {/* Main Card */}
      <Spotlight className="rounded-2xl">
        <AnimatedCard className="p-0" containerClassName="rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c6cf0]/20 to-[#4fc3f7]/20 border border-white/[0.06]">
                <NewspaperIcon />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">Decentralized News</h3>
                <p className="text-[10px] text-white/25 font-mono mt-0.5">{truncate(CONTRACT_ADDRESS)}</p>
              </div>
            </div>
            <Badge variant="info" className="text-[10px]">Soroban</Badge>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] px-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setError(null); setNewsData(null); }}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all",
                  activeTab === t.key ? "text-white/90" : "text-white/35 hover:text-white/55"
                )}
              >
                <span style={activeTab === t.key ? { color: t.color } : undefined}>{t.icon}</span>
                {t.label}
                {activeTab === t.key && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full transition-all"
                    style={{ background: `linear-gradient(to right, ${t.color}, ${t.color}66)` }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Read */}
            {activeTab === "read" && (
              <div className="space-y-5">
                <MethodSignature name="get_news" params="(news_id: u32)" returns="-> (Address, String)" color="#4fc3f7" />
                <Input label="News ID" type="number" min={1} value={readId} onChange={(e) => setReadId(e.target.value)} placeholder="e.g. 1" />
                <ShimmerButton onClick={handleReadNews} disabled={isReading} shimmerColor="#4fc3f7" className="w-full">
                  {isReading ? <><SpinnerIcon /> Reading...</> : <><SearchIcon /> Read Article</>}
                </ShimmerButton>

                {newsData && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden animate-fade-in-up">
                    <div className="border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">Article Content</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/35">Author</span>
                        <span className="font-mono text-sm text-white/80">{truncate(newsData.author)}</span>
                      </div>
                      <div className="pt-2 border-t border-white/[0.06]">
                        <span className="text-xs text-white/35 block mb-2">Content</span>
                        <p className="text-sm text-white/80 leading-relaxed">{newsData.content}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Publish */}
            {activeTab === "publish" && (
              <div className="space-y-5">
                <MethodSignature name="publish_news" params="(author: Address, content: String)" returns="-> u32" color="#7c6cf0" />
                <div className="space-y-2">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">News Content</label>
                  <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-px transition-all focus-within:border-[#7c6cf0]/30 focus-within:shadow-[0_0_20px_rgba(124,108,240,0.08)]">
                    <textarea
                      value={newsContent}
                      onChange={(e) => setNewsContent(e.target.value)}
                      placeholder="Write your news article here..."
                      rows={5}
                      className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none resize-none"
                    />
                  </div>
                </div>
                {walletAddress ? (
                  <ShimmerButton onClick={handlePublishNews} disabled={isPublishing} shimmerColor="#7c6cf0" className="w-full">
                    {isPublishing ? <><SpinnerIcon /> Publishing...</> : <><PenIcon /> Publish News</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#7c6cf0]/20 bg-[#7c6cf0]/[0.03] py-4 text-sm text-[#7c6cf0]/60 hover:border-[#7c6cf0]/30 hover:text-[#7c6cf0]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to publish news
                  </button>
                )}
              </div>
            )}

            {/* Stats */}
            {activeTab === "stats" && (
              <div className="space-y-5">
                <MethodSignature name="total_news" params="()" returns="-> u32" color="#fbbf24" />
                
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center animate-fade-in-up">
                  {isLoadingCount ? (
                    <div className="py-4"><SpinnerIcon /></div>
                  ) : totalCount !== null ? (
                    <>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-white/25 block mb-2">Total Articles</span>
                      <span className="text-5xl font-bold text-white/90">{totalCount}</span>
                    </>
                  ) : (
                    <p className="text-sm text-white/35">Click below to fetch stats</p>
                  )}
                </div>

                <ShimmerButton onClick={handleGetTotal} disabled={isLoadingCount} shimmerColor="#fbbf24" className="w-full">
                  {isLoadingCount ? <><SpinnerIcon /> Loading...</> : <><NewspaperIcon /> Get Total Articles</>}
                </ShimmerButton>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.04] px-6 py-3 flex items-center justify-between">
            <p className="text-[10px] text-white/15">Decentralized News Platform &middot; Soroban</p>
            <div className="flex items-center gap-2">
              {["Read", "Publish", "Stats"].map((s, i) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className="font-mono text-[9px] text-white/15">{s}</span>
                  {i < 2 && <span className="text-white/10 text-[8px]">&rarr;</span>}
                </span>
              ))}
            </div>
          </div>
        </AnimatedCard>
      </Spotlight>
    </div>
  );
}
