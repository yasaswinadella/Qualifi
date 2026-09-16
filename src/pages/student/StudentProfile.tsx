import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { parseResumeWithAI } from '../../lib/aiServices';
import { toast } from 'sonner';
import {
  Upload,
  Sparkles,
  Save,
  CheckCircle2,
  FileText,
  Briefcase,
  X,
  Plus,
  Layers,
  Award,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Point pdfjs to its bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export const StudentProfile: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [isParsing, setIsParsing] = useState(false);
  const [parsingStage, setParsingStage] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [newSkillInput, setNewSkillInput] = useState('');

  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    cgpa: user?.cgpa || 0,
    branch: user?.branch || '',
    degree: user?.degree || '',
    college: user?.college || '',
    skills: user?.parsed_resume?.skills || [],
    summary: user?.parsed_resume?.summary || '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        cgpa: user.cgpa || 0,
        branch: user.branch || '',
        degree: user.degree || '',
        college: user.college || '',
        skills: user.parsed_resume?.skills || [],
        summary: user.parsed_resume?.summary || '',
      });
    }
  }, [user]);

  const extractPdfText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ('str' in item ? (item as { str: string }).str : ''))
        .join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  };

  const processResumeContent = async (text: string) => {
    try {
      setIsParsing(true);
      setParsingStage('Extracting document text...');

      await new Promise((r) => setTimeout(r, 400));
      setParsingStage('Invoking Gemini 2.5 Flash for entity parsing...');

      const parsed = await parseResumeWithAI(text);
      setParsingStage('Validating structured education & skills...');

      const latestEdu = parsed.education?.[0];
      const newSkills = Array.from(
        new Set([...(formData.skills || []), ...(parsed.skills || [])])
      );

      const updatedCgpa = latestEdu?.cgpa && latestEdu.cgpa > 0 ? latestEdu.cgpa : formData.cgpa;
      const updatedCollege = latestEdu?.institution || formData.college;
      const updatedDegree = latestEdu?.degree || formData.degree;

      setFormData((prev) => ({
        ...prev,
        skills: newSkills,
        degree: updatedDegree,
        college: updatedCollege,
        cgpa: updatedCgpa,
        summary: parsed.summary || prev.summary,
      }));

      await updateProfile({
        parsed_resume: {
          ...parsed,
          skills: newSkills,
        },
        cgpa: updatedCgpa,
        degree: updatedDegree,
        college: updatedCollege,
      });

      toast.success('Resume parsed with Gemini 2.5 Flash and synced to profile!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to parse resume');
    } finally {
      setIsParsing(false);
      setParsingStage('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let extractedText = '';
      if (file.type === 'application/pdf') {
        extractedText = await extractPdfText(file);
      } else {
        extractedText = await file.text();
      }

      if (!extractedText.trim()) {
        toast.error('The selected file appears empty or unreadable.');
        return;
      }

      await processResumeContent(extractedText);
    } catch (err) {
      toast.error('Failed to extract text from file: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleAddSkill = () => {
    const trimmed = newSkillInput.trim();
    if (!trimmed) return;
    if (formData.skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      toast.info('Skill is already added');
      return;
    }
    const updated = [...formData.skills, trimmed];
    setFormData({ ...formData, skills: updated });
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((s) => s !== skillToRemove),
    });
  };

  const handleSave = async () => {
    try {
      await updateProfile({
        full_name: formData.full_name,
        email: formData.email,
        cgpa: Number(formData.cgpa),
        branch: formData.branch,
        degree: formData.degree,
        college: formData.college,
        parsed_resume: {
          skills: formData.skills,
          education: user?.parsed_resume?.education || [
            {
              institution: formData.college,
              degree: formData.degree,
              year: 2026,
              cgpa: Number(formData.cgpa),
            },
          ],
          projects: user?.parsed_resume?.projects || [],
          certifications: user?.parsed_resume?.certifications || [],
          summary: formData.summary,
        },
      });
      toast.success('Academic credentials and profile updated successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  // Compute profile completeness
  const completeness = [
    formData.full_name,
    formData.college,
    formData.degree,
    formData.branch,
    formData.cgpa > 0,
    formData.skills.length > 0,
  ].filter(Boolean).length;
  const completenessPct = Math.round((completeness / 6) * 100);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Student Academic Credential Profile</h1>
          <p className="text-xs text-slate-400">
            Automated entity parsing with Gemini 2.5 Flash, verified institutional cutoffs, and skills inventory.
          </p>
        </div>

        {/* Profile Completeness Pill */}
        <div className="flex items-center gap-3 rounded-2xl border border-borderSubtle bg-card px-4 py-2.5">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400">Profile Readiness</span>
            <p className="text-xs font-bold text-white">{completenessPct}% Complete</p>
          </div>
          <div className="h-9 w-9 rounded-full border-2 border-brandIndigo/40 bg-brandIndigo/10 flex items-center justify-center text-xs font-bold text-brandIndigo">
            {completenessPct}%
          </div>
        </div>
      </div>

      {/* Resume Upload Box */}
      <div className="rounded-2xl border border-dashed border-borderSubtle bg-card p-6 transition hover:border-brandIndigo/50">
        <input
          type="file"
          id="resumeUpload"
          className="hidden"
          accept=".pdf,.txt"
          onChange={handleFileUpload}
          disabled={isParsing}
        />
        <div className="flex flex-col items-center justify-center text-center">
          <label htmlFor="resumeUpload" className="flex cursor-pointer flex-col items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brandIndigo/10 text-brandIndigo transition hover:scale-105">
              {isParsing ? <Sparkles className="h-7 w-7 animate-spin text-brandAmber" /> : <Upload className="h-7 w-7" />}
            </div>
            <span className="mt-3 text-sm font-semibold text-white">
              {isParsing ? parsingStage : 'Upload Resume Document (PDF / TXT)'}
            </span>
            <span className="mt-1 text-xs text-slate-400">
              Gemini 2.5 Flash automatically extracts skills, GPA, degree, and projects into verified fields
            </span>
          </label>

          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-slate-500">or</span>
            <button
              onClick={() => setShowPasteModal(true)}
              className="rounded-lg border border-borderSubtle bg-obsidian px-3 py-1 text-xs text-slate-300 hover:text-white"
            >
              Paste Resume Raw Text
            </button>
          </div>
        </div>
      </div>

      {/* Editable Verified Profile Form */}
      <div className="rounded-2xl border border-borderSubtle bg-card p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-borderSubtle pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-brandEmerald" /> Verified Placement Credentials
          </h2>
          <span className="text-[11px] text-slate-400">Deterministic Hard Eligibility Keys</span>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-300">Full Name</label>
            <input
              type="text"
              className="mt-1.5 w-full rounded-xl border border-borderSubtle bg-obsidian px-3.5 py-2.5 text-xs text-white focus:border-brandIndigo focus:outline-none"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300">Email Address</label>
            <input
              type="email"
              className="mt-1.5 w-full rounded-xl border border-borderSubtle bg-obsidian px-3.5 py-2.5 text-xs text-white focus:border-brandIndigo focus:outline-none"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300">College / Institution</label>
            <input
              type="text"
              className="mt-1.5 w-full rounded-xl border border-borderSubtle bg-obsidian px-3.5 py-2.5 text-xs text-white focus:border-brandIndigo focus:outline-none"
              value={formData.college}
              onChange={(e) => setFormData({ ...formData, college: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300">Degree (e.g. B.Tech, M.Tech)</label>
            <input
              type="text"
              className="mt-1.5 w-full rounded-xl border border-borderSubtle bg-obsidian px-3.5 py-2.5 text-xs text-white focus:border-brandIndigo focus:outline-none"
              value={formData.degree}
              onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300">Academic Branch (e.g. Computer Science)</label>
            <input
              type="text"
              className="mt-1.5 w-full rounded-xl border border-borderSubtle bg-obsidian px-3.5 py-2.5 text-xs text-white focus:border-brandIndigo focus:outline-none"
              value={formData.branch}
              onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300">
              Current CGPA <span className="text-brandEmerald font-bold">(Hard Eligibility Cutoff Key)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="10"
              className="mt-1.5 w-full rounded-xl border border-borderSubtle bg-obsidian px-3.5 py-2.5 text-xs text-white focus:border-brandIndigo focus:outline-none"
              value={formData.cgpa}
              onChange={(e) => setFormData({ ...formData, cgpa: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-300">Professional Summary</label>
            <textarea
              rows={2}
              className="mt-1.5 w-full rounded-xl border border-borderSubtle bg-obsidian p-3 text-xs text-white focus:border-brandIndigo focus:outline-none"
              value={formData.summary}
              placeholder="Candidate background and career focus..."
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            />
          </div>

          {/* Interactive Skills Badges Manager */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-semibold text-slate-300">Extracted & Verified Skills Inventory</label>
            <div className="flex flex-wrap gap-2 rounded-xl border border-borderSubtle bg-obsidian p-3">
              {formData.skills.map((skill) => (
                <span
                  key={skill}
                  className="flex items-center gap-1.5 rounded-lg border border-brandIndigo/30 bg-brandIndigo/15 px-2.5 py-1 text-xs font-medium text-brandIndigo"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-slate-400 hover:text-brandRose"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}

              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="+ Add skill..."
                  className="rounded bg-transparent px-2 py-0.5 text-xs text-white focus:outline-none"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="rounded p-1 text-slate-400 hover:text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Projects Preview */}
        {user?.parsed_resume?.projects && user.parsed_resume.projects.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-brandIndigo" /> Verified Projects Portfolio
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {user.parsed_resume.projects.map((proj, idx) => (
                <div key={idx} className="rounded-xl border border-borderSubtle bg-obsidian p-3.5">
                  <p className="font-bold text-white text-xs">{proj.title}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{proj.description}</p>
                  {proj.techStack && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {proj.techStack.map((tech) => (
                        <span key={tech} className="rounded bg-card px-2 py-0.5 text-[10px] text-slate-300">
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end border-t border-borderSubtle pt-4">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-brandIndigo px-6 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-600 shadow-lg shadow-brandIndigo/20"
          >
            <Save className="h-4 w-4" /> Save Profile Credentials
          </button>
        </div>
      </div>

      {/* Paste Resume Raw Text Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-borderSubtle bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-borderSubtle pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-brandIndigo" /> Paste Resume Content
              </h3>
              <button onClick={() => setShowPasteModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4">
              <textarea
                rows={8}
                className="w-full rounded-xl border border-borderSubtle bg-obsidian p-3 font-mono text-xs text-slate-200 focus:border-brandIndigo focus:outline-none"
                placeholder="Paste your raw resume text here..."
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowPasteModal(false)}
                className="rounded-xl border border-borderSubtle px-4 py-2 text-xs text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!pasteText.trim()) {
                    toast.error('Please paste resume text first');
                    return;
                  }
                  setShowPasteModal(false);
                  await processResumeContent(pasteText);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-brandIndigo px-5 py-2 text-xs font-bold text-white hover:bg-indigo-600"
              >
                <Sparkles className="h-3.5 w-3.5" /> Parse with Gemini AI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
