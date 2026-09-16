import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { ragCareerAdvisor, isGeminiConfigured } from '../../lib/aiServices';
import { Bot, Send, User, Sparkles, Briefcase, Zap, HelpCircle, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';

export const AiAdvisorChat: React.FC = () => {
  const { user } = useAuth();
  const { benchmarks, jobs, applications } = useData();

  const studentName = user?.full_name?.split(' ')[0] || 'there';

  const [messages, setMessages] = useState<{ sender: 'USER' | 'AI'; text: string; timestamp: string }[]>([
    {
      sender: 'AI',
      text: `Hey ${studentName}! 👋 I'm your AI Career Advisor & Tech Mentor.\n\nI'm looking at your verified skill profile (${benchmarks.length} verified benchmarks, CGPA: ${user?.cgpa.toFixed(2) || '8.85'}) and your ${applications.length} tracked applications.\n\nWhat can we work on together today — technical interview prep, building projects to close a skill gap, or strategizing your next internship applications?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || isThinking) return;

    const userMsg = {
      sender: 'USER' as const,
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    if (!customPrompt) setInput('');
    setIsThinking(true);

    try {
      const studentContext = {
        profile: user,
        benchmarks,
        applications,
        availableJobs: jobs,
      };

      const aiResponse = await ragCareerAdvisor(studentContext, textToSend, newMsgs);

      setMessages([
        ...newMsgs,
        {
          sender: 'AI',
          text: aiResponse,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI request failed');
    } finally {
      setIsThinking(false);
    }
  };

  const quickPrompts = [
    'How should I prep for technical coding and interview rounds?',
    'Which live internships match my verified skills and CGPA?',
    'What skills should I focus on testing or improving next?',
    'Give me practical advice to strengthen my resume and project portfolio.',
  ];

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col rounded-2xl border border-borderSubtle bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-borderSubtle bg-obsidian/40 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brandIndigo to-brandPurple text-white shadow-md shadow-brandIndigo/20">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Career & Interview Mentor
              {isGeminiConfigured && (
                <span className="rounded-full bg-brandAmber/15 px-2 py-0.5 text-[10px] font-bold text-brandAmber flex items-center gap-1">
                  <Sparkles className="h-3 w-3 animate-spin" /> Gemini 2.5 Flash
                </span>
              )}
            </h2>
            <p className="text-[10px] text-slate-400">
              Personalized guidance grounded in your verified benchmarks & tracked applications.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-right text-[11px] text-slate-400">
          <div className="hidden sm:block">
            <span>Tracking <strong className="text-brandIndigo">{applications.length}</strong> applications</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-borderSubtle bg-obsidian px-2.5 py-1 text-slate-300">
            <GraduationCap className="h-3.5 w-3.5 text-brandEmerald" />
            <span>CGPA: <strong>{user?.cgpa.toFixed(2)}</strong></span>
          </div>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-3 animate-fadeIn ${m.sender === 'USER' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'AI' && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brandIndigo/20 text-brandIndigo">
                <Bot className="h-4 w-4" />
              </div>
            )}

            <div className={`max-w-2xl space-y-1 ${m.sender === 'USER' ? 'items-end' : 'items-start'}`}>
              <div
                className={`rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap ${
                  m.sender === 'USER'
                    ? 'bg-brandIndigo text-white font-medium shadow-md shadow-brandIndigo/10'
                    : 'border border-borderSubtle bg-obsidian text-slate-200 shadow-sm'
                }`}
              >
                {m.text}
              </div>
              <p className={`text-[9px] text-slate-500 px-1 ${m.sender === 'USER' ? 'text-right' : 'text-left'}`}>
                {m.timestamp}
              </p>
            </div>

            {m.sender === 'USER' && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {isThinking && (
          <div className="flex items-center gap-3 text-xs text-brandIndigo">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brandIndigo/20 text-brandIndigo">
              <Sparkles className="h-4 w-4 animate-spin" />
            </div>
            <span className="animate-pulse">Analyzing your benchmarks & application pipeline...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Strategic Prompt Chips */}
      <div className="border-t border-borderSubtle bg-obsidian/30 px-6 py-2.5">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[10px] font-bold uppercase text-slate-500 shrink-0">Quick Queries:</span>
          {quickPrompts.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip)}
              className="shrink-0 rounded-lg border border-borderSubtle bg-card px-3 py-1 text-[11px] text-slate-300 hover:border-brandIndigo hover:text-white transition"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Message Input Box */}
      <div className="flex gap-2 border-t border-borderSubtle bg-card p-4">
        <input
          type="text"
          className="flex-1 rounded-xl border border-borderSubtle bg-obsidian px-4 py-3 text-xs text-white focus:border-brandIndigo focus:outline-none"
          placeholder="Ask for interview prep advice, company insights, skill improvement tips, or resume feedback..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          disabled={isThinking || !input.trim()}
          onClick={() => handleSend()}
          className="flex items-center gap-2 rounded-xl bg-brandIndigo px-6 py-3 text-xs font-bold text-white transition hover:bg-indigo-600 disabled:opacity-40 shadow-md shadow-brandIndigo/20"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
};

