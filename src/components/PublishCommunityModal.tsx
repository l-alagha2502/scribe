import React, { useEffect, useState } from 'react';
import {
  X,
  Download,
  ExternalLink,
  Check,
  GitPullRequest,
  Layers,
} from 'lucide-react';
import { ProjectRecord, AssetRecord, CustomFontRecord } from '../types';
import { buildScribeFilename, downloadScribeFile } from '../utils/scribePackage';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { ModalPortal } from './ModalPortal';

export const GITHUB_REPO_URL = 'https://github.com/l-alagha2502/scribe';

interface PublishCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectRecord;
  allAssets?: AssetRecord[];
  allFonts?: CustomFontRecord[];
  savedFilename?: string;
}

export const PublishCommunityModal: React.FC<PublishCommunityModalProps> = ({
  isOpen,
  onClose,
  project,
  allAssets = [],
  allFonts = [],
  savedFilename,
}) => {
  const [downloadedRecently, setDownloadedRecently] = useState(false);
  const { backdropProps, contentProps } = useModalBehavior(isOpen, onClose);

  const filename = savedFilename || buildScribeFilename(project.name);

  useEffect(() => {
    if (isOpen) {
      setDownloadedRecently(false);
    }
  }, [isOpen, project.id]);

  if (!isOpen) return null;

  const handleDownloadScribe = () => {
    downloadScribeFile(project, allAssets, allFonts);
    setDownloadedRecently(true);
    window.setTimeout(() => setDownloadedRecently(false), 2500);
  };

  return (
    <ModalPortal>
      <div
        data-testid="share-template-modal"
        aria-labelledby="share-template-modal-title"
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
        {...backdropProps}
      >
      <div
        className="w-full max-w-md bg-[#0b0c10]/95 backdrop-blur-2xl border border-white/[0.1] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scaleUp"
        {...contentProps}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="share-template-modal-title"
                className="text-sm font-semibold text-white tracking-tight"
              >
                Saved to your templates
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                Want to share it with everyone?
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="share-modal-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0"
            aria-label="Close popup"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 text-xs text-slate-300">
          {/* Template Summary Chip */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-[#08080a] border border-white/[0.08] overflow-hidden shrink-0 flex items-center justify-center">
              {project.thumbnail ? (
                <img
                  src={project.thumbnail}
                  alt={project.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Layers className="w-5 h-5 text-slate-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">
                {project.name || 'Untitled Design'}
              </div>
              <div className="text-[11px] text-slate-400 font-mono truncate">
                {filename}
              </div>
            </div>
          </div>

          {/* Simple Human Instructions */}
          <div className="space-y-2.5 leading-relaxed">
            <p className="text-xs text-slate-200">
              We saved a copy right here in your local template library and prepared your{' '}
              <code className="font-mono text-white bg-white/[0.07] px-1.5 py-0.5 rounded">
                .scribe
              </code>{' '}
              file. To share it with the community:
            </p>

            <ol className="space-y-2 text-xs text-slate-300 pl-1">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-white/[0.08] border border-white/[0.1] text-white text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  Download the <strong className="text-white font-medium">.scribe</strong> file to your computer.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-white/[0.08] border border-white/[0.1] text-white text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  Head over to GitHub at{' '}
                  <a
                    href={GITHUB_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white underline underline-offset-2 hover:text-slate-200 break-all"
                  >
                    github.com/l-alagha2502/scribe
                  </a>
                  .
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-white/[0.08] border border-white/[0.1] text-white text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  Open a new Pull Request and submit your template file there!
                </span>
              </li>
            </ol>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-white/[0.07] bg-white/[0.02] flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            data-testid="share-modal-download-btn"
            onClick={handleDownloadScribe}
            className="py-2 px-3 rounded-xl bg-white/[0.07] hover:bg-white/[0.13] border border-white/[0.1] text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {downloadedRecently ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Downloaded</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download .scribe</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="share-modal-github-link"
              className="py-2 px-3.5 rounded-xl bg-white text-[#08080a] hover:bg-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              <span>Open GitHub</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>

            <button
              type="button"
              data-testid="share-modal-done-btn"
              onClick={onClose}
              className="py-2 px-3 rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.07] text-xs font-medium transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

export const ShareTemplateModal = PublishCommunityModal;
