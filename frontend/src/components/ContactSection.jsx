import React, { useState, useRef } from 'react';
import emailjs from '@emailjs/browser';
import toast from 'react-hot-toast';
import { Send, CheckCircle2, AlertCircle, Sparkles, Settings, Info, Loader2 } from 'lucide-react';

/**
 * ContactSection / Helpdesk Inquiry Form
 * Integrates directly with EmailJS (@emailjs/browser)
 * 
 * Configured via Vite environment variables:
 * - VITE_EMAILJS_SERVICE_ID
 * - VITE_EMAILJS_TEMPLATE_ID
 * - VITE_EMAILJS_PUBLIC_KEY
 */
export default function ContactSection({
  titlePrefix = "MESSAGE THE",
  titleHighlight = "HELPDESK",
  subtitle = "Send your festival inquiries or questions directly to our organizing desk.",
  defaultTopic = "",
  className = ""
}) {
  const formRef = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    topic: defaultTopic,
    message: '',
  });

  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);

  const cleanKey = (k) => {
    if (!k) return '';
    const trimmed = String(k).trim();
    // In case key was accidentally pasted twice (e.g. 17 char key pasted twice = 34 chars)
    if (trimmed.length === 34 && trimmed.slice(0, 17) === trimmed.slice(17)) {
      return trimmed.slice(0, 17);
    }
    return trimmed;
  };

  // Local storage / env credentials fallback
  const [customConfig, setCustomConfig] = useState(() => {
    return {
      serviceId: localStorage.getItem('EMAILJS_SERVICE_ID') || import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_lrpom2a',
      templateId: localStorage.getItem('EMAILJS_TEMPLATE_ID') || import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_owca9wp',
      publicKey: cleanKey(localStorage.getItem('EMAILJS_PUBLIC_KEY') || import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'SxC7rybnGlfYr-c5D'),
    };
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    localStorage.setItem('EMAILJS_SERVICE_ID', customConfig.serviceId.trim());
    localStorage.setItem('EMAILJS_TEMPLATE_ID', customConfig.templateId.trim());
    localStorage.setItem('EMAILJS_PUBLIC_KEY', customConfig.publicKey.trim());
    setShowConfigModal(false);
    toast.success('EmailJS settings saved successfully!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Form validation
    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!formData.email.trim() || !/^\S+@\S+\.\S+$/.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!formData.topic.trim()) {
      toast.error('Please enter an inquiry topic');
      return;
    }
    if (!formData.message.trim()) {
      toast.error('Please enter your message');
      return;
    }

    const serviceId = (customConfig.serviceId || import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_lrpom2a').trim();
    const templateId = (customConfig.templateId || import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_owca9wp').trim();
    const publicKey = cleanKey(customConfig.publicKey || import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'SxC7rybnGlfYr-c5D');

    setStatus('loading');

    // If EmailJS credentials are not configured yet, notify user and provide simulated preview
    if (!serviceId || !templateId || !publicKey) {
      setTimeout(() => {
        setStatus('idle');
        toast((t) => (
          <div className="flex flex-col gap-1.5 text-xs">
            <span className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
              <Sparkles size={16} className="text-amber-500" /> EmailJS Not Configured
            </span>
            <span className="text-gray-600">
              Please add your EmailJS keys in <code>.env</code> or click the gear icon to set them.
            </span>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                setShowConfigModal(true);
              }}
              className="mt-1 px-2.5 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-bold text-center"
            >
              Configure EmailJS Keys
            </button>
          </div>
        ), { duration: 6000 });
      }, 700);
      return;
    }

    try {
      const templateParams = {
        name: formData.name.trim(),
        from_name: formData.name.trim(),
        user_name: formData.name.trim(),
        email: formData.email.trim(),
        from_email: formData.email.trim(),
        user_email: formData.email.trim(),
        reply_to: formData.email.trim(),
        topic: formData.topic.trim(),
        subject: formData.topic.trim(),
        inquiry_topic: formData.topic.trim(),
        message: formData.message.trim(),
        question: formData.message.trim(),
        inquiry: formData.message.trim(),
        time: new Date().toLocaleString(),
        submitted_at: new Date().toLocaleString(),
      };

      await emailjs.send(serviceId, templateId, templateParams, publicKey);

      setStatus('success');
      toast.success('Inquiry submitted successfully! We will get back to you soon.');
      setFormData({
        name: '',
        email: '',
        topic: defaultTopic,
        message: '',
      });

      // Auto reset success state after 5 seconds
      setTimeout(() => {
        setStatus('idle');
      }, 5000);
    } catch (error) {
      console.error('EmailJS Error:', error);
      setStatus('error');
      const errText = error?.text || error?.message || 'Failed to send inquiry. Please try again later.';
      setErrorMessage(errText);
      toast.error(errText);
    }
  };

  return (
    <div className={`w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 ${className}`}>
      {/* ── Main Glass Card ── */}
      <div className="relative rounded-[28px] bg-[#0c1222]/95 border border-slate-700/40 p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl text-white">
        
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header with Quick Settings trigger */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
              {titlePrefix}{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                {titleHighlight}
              </span>
            </h2>
            <p className="text-sm sm:text-base text-slate-400 mt-2 font-normal leading-relaxed">
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            title="EmailJS Settings"
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/70 border border-slate-700/50 text-slate-400 hover:text-white transition-all duration-150 flex-shrink-0"
          >
            <Settings size={18} />
          </button>
        </div>

        {/* Status alerts */}
        {status === 'success' && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 animate-[fadeUp_0.3s_ease]">
            <CheckCircle2 size={22} className="flex-shrink-0 text-emerald-400" />
            <div className="text-sm">
              <span className="font-bold">Thank you!</span> Your inquiry has been transmitted to our desk. We'll reply to your email shortly.
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-center gap-3 text-rose-300 animate-[fadeUp_0.3s_ease]">
            <AlertCircle size={22} className="flex-shrink-0 text-rose-400" />
            <div className="text-sm">
              <span className="font-bold">Sending Failed:</span> {errorMessage}
            </div>
          </div>
        )}

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
          {/* Row 1: Name & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 tracking-wider uppercase mb-2">
                YOUR NAME <span className="text-pink-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Rahul Verma"
                required
                className="w-full px-4 py-3.5 bg-[#090d18] border border-slate-700/60 rounded-xl sm:rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 transition-all duration-150"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 tracking-wider uppercase mb-2">
                EMAIL ADDRESS <span className="text-pink-400">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. rahul@university.edu"
                required
                className="w-full px-4 py-3.5 bg-[#090d18] border border-slate-700/60 rounded-xl sm:rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 transition-all duration-150"
              />
            </div>
          </div>

          {/* Row 2: Topic */}
          <div>
            <label className="block text-xs font-bold text-slate-300 tracking-wider uppercase mb-2">
              INQUIRY TOPIC <span className="text-pink-400">*</span>
            </label>
            <input
              type="text"
              name="topic"
              value={formData.topic}
              onChange={handleChange}
              placeholder="e.g. Hackathon Team Size or Event Queries"
              required
              className="w-full px-4 py-3.5 bg-[#090d18] border border-slate-700/60 rounded-xl sm:rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 transition-all duration-150"
            />
          </div>

          {/* Row 3: Message */}
          <div>
            <label className="block text-xs font-bold text-slate-300 tracking-wider uppercase mb-2">
              MESSAGE <span className="text-pink-400">*</span>
            </label>
            <textarea
              name="message"
              rows={4}
              value={formData.message}
              onChange={handleChange}
              placeholder="Write your question..."
              required
              className="w-full px-4 py-3.5 bg-[#090d18] border border-slate-700/60 rounded-xl sm:rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 transition-all duration-150 resize-y"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-4 px-6 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base uppercase tracking-wider text-white bg-gradient-to-r from-[#6366f1] via-[#a855f7] to-[#ec4899] hover:from-[#4f46e5] hover:via-[#9333ea] hover:to-[#db2777] active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none shadow-[0_10px_30px_-5px_rgba(168,85,247,0.4)] transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 size={19} className="animate-spin" />
                  <span>TRANSMITTING INQUIRY...</span>
                </>
              ) : (
                <>
                  <Send size={18} className="transform -rotate-12" />
                  <span>SUBMIT INQUIRY</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── EmailJS Settings Modal ── */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-[fadeUp_0.2s_ease]">
          <div className="relative w-full max-w-md bg-[#0f172a] border border-slate-700 rounded-3xl p-6 sm:p-7 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Settings size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">EmailJS Setup</h3>
                  <p className="text-xs text-slate-400">Configure your email gateway</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="mt-5 space-y-4">
              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-2">
                <Info size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                <span>
                  Obtain these from your <a href="https://dashboard.emailjs.com" target="_blank" rel="noreferrer" className="text-purple-300 underline font-semibold">EmailJS Dashboard</a>. Values can also be placed in <code>.env</code> file.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Service ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. service_xxxxxxx"
                  value={customConfig.serviceId}
                  onChange={(e) => setCustomConfig({ ...customConfig, serviceId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#090d18] border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Template ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. template_xxxxxxx"
                  value={customConfig.templateId}
                  onChange={(e) => setCustomConfig({ ...customConfig, templateId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#090d18] border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Public Key (User ID)
                </label>
                <input
                  type="text"
                  placeholder="e.g. user_xxxxxxxxxxxxxxx"
                  value={customConfig.publicKey}
                  onChange={(e) => setCustomConfig({ ...customConfig, publicKey: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#090d18] border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-xs font-bold text-white uppercase tracking-wider shadow-lg shadow-purple-500/20"
                >
                  Save Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
