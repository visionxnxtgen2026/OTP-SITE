import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LifeBuoy, BookOpen, Rocket, Code2, Server, DollarSign,
  AlertTriangle, HelpCircle, Bug, Mail, MessageSquare,
  Activity, History, ArrowRight
} from 'lucide-react';

const GithubIcon = ({ size = 16, className }) => (
  <svg height={size} width={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

export const HelpSupport = () => {
  const navigate = useNavigate();

  const handleBackToPortal = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  const supportCategories = [
    {
      icon: BookOpen,
      title: 'Documentation',
      desc: 'Integration guides, SDK reference, and HTTP API schemas.',
      action: 'View Documentation',
      onClick: () => navigate('/docs')
    },
    {
      icon: Rocket,
      title: 'Quick Start Guide',
      desc: 'Integrate DDS phone auth in under 2 minutes.',
      action: 'Quick Start Guide',
      onClick: () => navigate('/docs#quick-start')
    },
    {
      icon: Code2,
      title: 'SDK Documentation',
      desc: 'Configure the @dds/server SDK with framework handlers.',
      action: 'SDK Documentation',
      onClick: () => navigate('/docs#sdk-usage')
    },
    {
      icon: Server,
      title: 'API Reference',
      desc: 'HTTP rest routes, payloads, and response patterns.',
      action: 'API Reference',
      onClick: () => navigate('/docs#api-reference')
    },
    {
      icon: AlertTriangle,
      title: 'Error Code Reference',
      desc: 'Browse code meanings, HTTP statuses, and solutions.',
      action: 'Error Code Reference',
      onClick: () => navigate('/docs#error-codes')
    },
    {
      icon: History,
      title: 'Release Notes',
      desc: 'What is new in the latest v2.0 version of DDS.',
      action: 'Release Notes',
      onClick: () => navigate('/docs#changelog')
    },
    {
      icon: DollarSign,
      title: 'Billing Help',
      desc: 'Manage Pay As You Go invoices, grace periods, and card entries.',
      action: 'Billing Help',
      href: 'mailto:support@dds.com?subject=Billing%20Support%20Inquiry'
    },
    {
      icon: HelpCircle,
      title: 'FAQ',
      desc: 'Browse answers to frequently asked integration questions.',
      action: 'Browse FAQs',
      href: 'mailto:support@dds.com?subject=FAQ%20Question'
    },
    {
      icon: Bug,
      title: 'Report an Issue',
      desc: 'Report platform bugs or security vulnerabilities.',
      action: 'Report Issue',
      href: 'mailto:bugs@dds.com?subject=Bug%20Report'
    },
    {
      icon: Mail,
      title: 'Email Support',
      desc: 'Send an email case directly to support@dds.com.',
      action: 'Email Support',
      href: 'mailto:support@dds.com'
    },
    {
      icon: MessageSquare,
      title: 'Live Chat',
      desc: 'Direct real-time messaging with engineering (coming soon).',
      action: 'Chat (Disabled)',
      disabled: true
    },
    {
      icon: GithubIcon,
      title: 'GitHub Repository',
      desc: 'Browse official SDK repos, file logs, and submit pull requests.',
      action: 'Open GitHub',
      href: 'https://github.com',
      external: true
    },
    {
      icon: Activity,
      title: 'System Status',
      desc: 'Uptime indicators, server health, and platform latency logs.',
      action: 'Check System Status',
      href: 'mailto:support@dds.com?subject=System%20Status%20Check'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-800 dark:text-slate-200 flex flex-col transition-colors duration-200">
      {/* Sticky Header */}
      <header className="bg-white dark:bg-[#0d1321] border-b border-slate-200 dark:border-slate-800/80 px-6 py-4 sticky top-0 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToPortal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm border border-slate-150 dark:border-slate-750 shrink-0"
          >
            ← Back to Developer Portal
          </button>
          <div className="flex items-center gap-2">
            <LifeBuoy className="text-blue-650" size={20} />
            <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-tight uppercase">Support Center</h1>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 font-semibold max-w-sm sm:text-right">Browse official resources and connect with developer relations.</p>
      </header>

      {/* Main Grid */}
      <div className="flex-grow max-w-5xl w-full mx-auto px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {supportCategories.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-[#0d1321] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-800 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-900 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/30 text-slate-550 group-hover:text-blue-650 dark:group-hover:text-blue-400 flex items-center justify-center shrink-0 transition-colors">
                    <Icon size={16} />
                  </div>
                  <div>
                    <h3 className="font-black text-xs text-slate-900 dark:text-white">{item.title}</h3>
                    <p className="text-[11px] text-slate-450 dark:text-slate-400 font-semibold leading-relaxed mt-1">{item.desc}</p>
                  </div>
                </div>

                <div className="pt-4 mt-auto">
                  {item.onClick ? (
                    <button
                      onClick={item.onClick}
                      className="w-full py-2 bg-slate-50 hover:bg-blue-600 hover:text-white dark:bg-slate-800 dark:hover:bg-blue-600 dark:text-slate-200 dark:hover:text-white text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm border border-slate-150 dark:border-slate-750"
                    >
                      {item.action} <ArrowRight size={11} />
                    </button>
                  ) : item.href ? (
                    <a
                      href={item.href}
                      target={item.external ? '_blank' : undefined}
                      rel={item.external ? 'noopener noreferrer' : undefined}
                      className="w-full py-2 bg-slate-50 hover:bg-blue-600 hover:text-white dark:bg-slate-800 dark:hover:bg-blue-600 dark:text-slate-200 dark:hover:text-white text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 text-center shadow-sm border border-slate-155 dark:border-slate-755"
                    >
                      {item.action} <ArrowRight size={11} />
                    </a>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2 bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 text-xs font-bold rounded-xl cursor-not-allowed flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-850"
                    >
                      {item.action}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HelpSupport;
