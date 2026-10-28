import React, { useState, useRef } from "react";
import {
  FileText,
  UploadCloud,
  Eye,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Download,
  ShieldCheck,
  FileCheck,
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import {
  validateResumeFile,
  uploadResumeFile,
  replaceResumeFile,
  deleteResumeFile,
  ResumeMetadata,
} from "../lib/firebase";

export interface ResumeDataState {
  resumeURL?: string | null;
  resumeFileName?: string | null;
  resumeStoragePath?: string | null;
  resumeFileType?: string | null;
  resumeFileSize?: number | null;
  resumeUploadedAt?: any;
}

interface ResumeSectionProps {
  currentUser: FirebaseUser | null;
  resumeData?: ResumeDataState | null;
  onUpdateResume?: (data: ResumeMetadata | null) => void;
  onOpenAuth?: () => void;
  variant?: "card" | "full";
  className?: string;
}

export const ResumeSection: React.FC<ResumeSectionProps> = ({
  currentUser,
  resumeData,
  onUpdateResume,
  onOpenAuth,
  variant = "card",
  className = "",
}) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Check if resume currently exists
  const hasResume = Boolean(resumeData?.resumeURL && resumeData?.resumeFileName);

  // Format File Size
  const formatFileSize = (bytes?: number | null): string => {
    if (!bytes || bytes <= 0) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Format Upload Date
  const formatUploadDate = (dateVal: any): string => {
    if (!dateVal) return "Recently uploaded";
    try {
      if (typeof dateVal?.toDate === "function") {
        return dateVal.toDate().toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
      const parsed = new Date(dateVal);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
    } catch {
      // Fallback
    }
    return "Recently uploaded";
  };

  // Format File Type & Badge Color
  const getFileTypeBadge = (mime?: string | null, fileName?: string | null) => {
    const isDocx =
      (mime && (mime.includes("word") || mime.includes("officedocument"))) ||
      (fileName && fileName.toLowerCase().endsWith(".docx"));

    if (isDocx) {
      return {
        label: "DOCX",
        badgeStyle: "bg-[#EBF3FF] text-[#1E4D8C] border-[#CFE1FA]",
      };
    }
    return {
      label: "PDF",
      badgeStyle: "bg-[#FDF2F2] text-[#9E2A2B] border-[#F8D7DA]",
    };
  };

  // Show temporary feedback toast
  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage(null);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4500);
  };

  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage(null);
  };

  // -------------------------------------------------------------
  // File Upload Handler (First-time upload)
  // -------------------------------------------------------------
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!currentUser?.uid) {
      if (onOpenAuth) onOpenAuth();
      triggerError("Please sign in to upload and sync your resume.");
      return;
    }

    // Reset input value so same file can be re-selected if needed
    event.target.value = "";
    await processUpload(file, false);
  };

  // -------------------------------------------------------------
  // File Replace Handler
  // -------------------------------------------------------------
  const handleReplaceSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!currentUser?.uid) {
      if (onOpenAuth) onOpenAuth();
      triggerError("Please sign in to manage your resume.");
      return;
    }

    event.target.value = "";
    await processUpload(file, true);
  };

  // Unified upload processor with validation and progress
  const processUpload = async (file: File, isReplace: boolean) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Client validation: max 10MB, PDF or DOCX
    const validation = validateResumeFile(file);
    if (!validation.valid) {
      triggerError(validation.error || "Invalid file format.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      let result;
      if (isReplace && resumeData?.resumeStoragePath) {
        // Replace: uploads new file, updates Firestore, and deletes old file only after success
        result = await replaceResumeFile(
          currentUser!.uid,
          file,
          resumeData.resumeStoragePath,
          (percent) => setUploadProgress(percent)
        );
      } else {
        // Standard first-time upload
        result = await uploadResumeFile(currentUser!.uid, file, (percent) =>
          setUploadProgress(percent)
        );
      }

      if (result.success && result.data) {
        if (onUpdateResume) {
          onUpdateResume(result.data);
        }
        triggerSuccess(
          isReplace ? "Resume replaced successfully." : "Resume uploaded successfully."
        );
      } else {
        triggerError(result.error || "Failed to upload resume.");
      }
    } catch (err: any) {
      console.error("Resume upload failed:", err);
      triggerError(
        err?.message || "An unexpected error occurred during upload. Please try again."
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // -------------------------------------------------------------
  // Delete Resume Handler
  // -------------------------------------------------------------
  const handleDeleteResume = async () => {
    if (!currentUser?.uid) {
      triggerError("Authentication required to delete resume.");
      setIsConfirmingDelete(false);
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const result = await deleteResumeFile(
        currentUser.uid,
        resumeData?.resumeStoragePath || null
      );

      if (result.success) {
        if (onUpdateResume) {
          onUpdateResume(null);
        }
        setIsConfirmingDelete(false);
        triggerSuccess("Resume deleted successfully.");
      } else {
        triggerError(result.error || "Failed to delete resume.");
      }
    } catch (err: any) {
      console.error("Delete resume error:", err);
      triggerError(err?.message || "Failed to delete resume.");
    } finally {
      setIsDeleting(false);
    }
  };

  // -------------------------------------------------------------
  // View Resume Handler
  // -------------------------------------------------------------
  const handleViewResume = () => {
    if (!resumeData?.resumeURL) {
      triggerError("Resume URL is not available.");
      return;
    }

    const isDocx =
      (resumeData.resumeFileType &&
        (resumeData.resumeFileType.includes("word") ||
          resumeData.resumeFileType.includes("officedocument"))) ||
      (resumeData.resumeFileName &&
        resumeData.resumeFileName.toLowerCase().endsWith(".docx"));

    if (isDocx) {
      // DOCX: Safe trigger download/open with original filename
      const link = document.createElement("a");
      link.href = resumeData.resumeURL;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = resumeData.resumeFileName || "Resume.docx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // PDF: Open safely in a new browser tab
      window.open(resumeData.resumeURL, "_blank", "noopener,noreferrer");
    }
  };

  // -------------------------------------------------------------
  // Drag and Drop Handlers
  // -------------------------------------------------------------
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading && !isDeleting) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isUploading || isDeleting) return;

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!currentUser?.uid) {
      if (onOpenAuth) onOpenAuth();
      triggerError("Please sign in to upload your resume.");
      return;
    }

    await processUpload(file, hasResume);
  };

  const typeInfo = getFileTypeBadge(resumeData?.resumeFileType, resumeData?.resumeFileName);

  // -------------------------------------------------------------
  // RENDER: Card Variant (Dashboard 3-col placement)
  // -------------------------------------------------------------
  if (variant === "card") {
    return (
      <div
        id="resume-section-card"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`bg-[#FAF8F5] rounded-2xl border ${
          isDragging ? "border-[#C85A32] bg-[#FBF2EC]" : "border-[#E7E2DA]"
        } p-5 flex flex-col justify-between shadow-xs transition-all relative ${className}`}
      >
        {/* Hidden File Inputs */}
        <input
          id="resume-file-input"
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          id="resume-replace-file-input"
          ref={replaceInputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleReplaceSelect}
          className="hidden"
        />

        {/* Top Header */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#8C4A2F]" />
              Resume Document
            </span>
            {hasResume ? (
              <span
                id="resume-type-badge"
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeInfo.badgeStyle}`}
              >
                {typeInfo.label} • {formatFileSize(resumeData?.resumeFileSize)}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F5EFE6] text-stone-600 border border-[#E7E1D7]">
                Max 10 MB
              </span>
            )}
          </div>

          {/* Feedback Banners */}
          {successMessage && (
            <div
              id="resume-success-toast"
              className="mt-3 p-2.5 rounded-xl bg-[#EFF5F0] border border-[#D5E4D8] flex items-center justify-between text-xs text-[#285731] animate-in fade-in"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#345B3C] shrink-0" />
                <span className="font-medium">{successMessage}</span>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-stone-400 hover:text-stone-600 p-0.5"
                aria-label="Dismiss message"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {errorMessage && (
            <div
              id="resume-error-toast"
              className="mt-3 p-2.5 rounded-xl bg-[#FDF2F2] border border-[#F8D7DA] flex items-center justify-between text-xs text-[#9E2A2B] animate-in fade-in"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#9E2A2B] shrink-0" />
                <span className="font-medium">{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-stone-400 hover:text-stone-600 p-0.5"
                aria-label="Dismiss error"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="mt-3 p-3 rounded-xl bg-[#FFFFFF] border border-[#E7E2DA] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-stone-700 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C85A32]" />
                  Uploading to Firebase Storage...
                </span>
                <span className="font-bold text-[#C85A32]">{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#F0ECE4] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C85A32] rounded-full transition-all duration-200"
                  style={{ width: `${Math.max(5, uploadProgress)}%` }}
                />
              </div>
            </div>
          )}

          {/* Main Content Area */}
          {!hasResume ? (
            /* EMPTY STATE */
            <div className="mt-3.5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F0EAE1] flex items-center justify-center text-stone-800 shrink-0">
                  <UploadCloud className="w-5 h-5 text-[#8C4A2F]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900 font-editorial">
                    Upload Resume
                  </h4>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                    Upload your latest resume to unlock personalized AI career features.
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#EDE8E0] flex items-center justify-between text-[11px] text-stone-500">
                <span>PDF or DOCX supported</span>
                <span>Max 10 MB</span>
              </div>
            </div>
          ) : (
            /* RESUME EXISTS STATE */
            <div className="mt-3.5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F0EAE1] flex items-center justify-center text-stone-800 shrink-0">
                  <FileCheck className="w-5 h-5 text-[#345B3C]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4
                    id="resume-filename-display"
                    className="text-xs font-bold text-stone-900 truncate"
                    title={resumeData?.resumeFileName || "Resume"}
                  >
                    {resumeData?.resumeFileName || "Uploaded Resume"}
                  </h4>
                  <div className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{formatUploadDate(resumeData?.resumeUploadedAt)}</span>
                    <span>•</span>
                    <span>{formatFileSize(resumeData?.resumeFileSize)}</span>
                  </div>
                </div>
              </div>

              {/* Inline Delete Confirmation */}
              {isConfirmingDelete && (
                <div
                  id="delete-confirmation-box"
                  className="mt-3 p-3 rounded-xl bg-[#FFF6F6] border border-[#F5C2C7] space-y-2 text-xs"
                >
                  <p className="font-semibold text-stone-800">
                    Delete this resume? This will remove the file from cloud storage.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      id="confirm-delete-btn"
                      onClick={handleDeleteResume}
                      disabled={isDeleting}
                      className="px-3 py-1.5 rounded-lg bg-[#DC3545] hover:bg-[#BB2D3B] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <span>Yes, Delete</span>
                      )}
                    </button>
                    <button
                      id="cancel-delete-btn"
                      onClick={() => setIsConfirmingDelete(false)}
                      disabled={isDeleting}
                      className="px-3 py-1.5 rounded-lg border border-[#DDD5C9] bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Actions Footer */}
        <div className="mt-4 pt-3 border-t border-[#EDE8E0]">
          {!hasResume ? (
            /* Upload Action */
            <button
              id="upload-resume-btn"
              onClick={() => {
                if (!currentUser && onOpenAuth) {
                  onOpenAuth();
                  return;
                }
                fileInputRef.current?.click();
              }}
              disabled={isUploading}
              className="w-full py-2 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-[#FAF8F5] text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E6B89C]" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5 text-[#E6B89C]" />
                  <span>Upload Resume</span>
                </>
              )}
            </button>
          ) : (
            /* View, Replace, Delete Actions */
            <div className="flex items-center justify-between gap-2">
              <button
                id="view-resume-btn"
                onClick={handleViewResume}
                disabled={isUploading || isDeleting}
                className="flex-1 py-1.5 px-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-[#FAF8F5] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Eye className="w-3.5 h-3.5 text-[#E6B89C]" />
                <span>View</span>
              </button>

              <button
                id="replace-resume-btn"
                onClick={() => replaceInputRef.current?.click()}
                disabled={isUploading || isDeleting}
                className="py-1.5 px-2.5 rounded-lg border border-[#E0D9CE] bg-white hover:bg-[#F5EFE6] text-stone-800 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Replace with new PDF/DOCX"
              >
                <RefreshCw className="w-3 h-3 text-stone-600" />
                <span>Replace</span>
              </button>

              <button
                id="delete-resume-btn"
                onClick={() => setIsConfirmingDelete(true)}
                disabled={isUploading || isDeleting || isConfirmingDelete}
                className="p-1.5 rounded-lg border border-[#E0D9CE] bg-white hover:bg-[#FDF2F2] text-stone-500 hover:text-[#9E2A2B] transition-colors cursor-pointer"
                title="Delete Resume"
                aria-label="Delete Resume"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Full / Banner Variant (Profile & Resume tab integration)
  // -------------------------------------------------------------
  return (
    <div
      id="resume-section-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`rounded-2xl border ${
        isDragging ? "border-[#C85A32] bg-[#FBF2EC]" : "border-[#E7E2DA] bg-[#FAF8F5]"
      } p-6 shadow-xs transition-all ${className}`}
    >
      {/* Hidden File Inputs */}
      <input
        id="resume-file-input-full"
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        id="resume-replace-file-input-full"
        ref={replaceInputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleReplaceSelect}
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#ECE6DC]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F0EAE1] flex items-center justify-center text-stone-800">
            <FileText className="w-5 h-5 text-[#8C4A2F]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900 font-editorial">
              Uploaded Resume Document
            </h3>
            <p className="text-xs text-stone-600 mt-0.5">
              Securely stored in Firebase Storage and linked directly to your authenticated UID.
            </p>
          </div>
        </div>

        {hasResume && (
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${typeInfo.badgeStyle}`}>
              {typeInfo.label}
            </span>
            <span className="text-xs font-semibold text-stone-600 bg-white px-2.5 py-1 rounded-full border border-[#E0D9CE]">
              {formatFileSize(resumeData?.resumeFileSize)}
            </span>
          </div>
        )}
      </div>

      {/* Notifications */}
      {successMessage && (
        <div
          id="resume-full-success"
          className="mt-4 p-3 rounded-xl bg-[#EFF5F0] border border-[#D5E4D8] flex items-center justify-between text-xs text-[#285731] animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#345B3C] shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-stone-400 hover:text-stone-600 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div
          id="resume-full-error"
          className="mt-4 p-3 rounded-xl bg-[#FDF2F2] border border-[#F8D7DA] flex items-center justify-between text-xs text-[#9E2A2B] animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#9E2A2B] shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-stone-400 hover:text-stone-600 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="mt-4 p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E7E2DA] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-800 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#C85A32]" />
              Uploading to Firebase Storage...
            </span>
            <span className="font-bold text-[#C85A32]">{uploadProgress}%</span>
          </div>
          <div className="w-full h-2 bg-[#F0ECE4] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#C85A32] rounded-full transition-all duration-200"
              style={{ width: `${Math.max(5, uploadProgress)}%` }}
            />
          </div>
        </div>
      )}

      {/* Body */}
      {!hasResume ? (
        /* Empty State */
        <div className="mt-5 text-center py-6 px-4 bg-white rounded-xl border border-dashed border-[#DDD5C9]">
          <div className="w-12 h-12 rounded-2xl bg-[#FBEFE9] text-[#C85A32] flex items-center justify-center mx-auto mb-3 border border-[#F3DACF]">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-stone-900">Upload Resume</h4>
          <p className="text-xs text-stone-600 mt-1 max-w-md mx-auto leading-relaxed">
            Upload your latest resume to unlock personalized AI career features.
          </p>
          <p className="text-[11px] text-stone-400 mt-1">
            Accepts PDF (.pdf) and Word (.docx) documents up to 10 MB.
          </p>

          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              id="upload-resume-btn-full"
              onClick={() => {
                if (!currentUser && onOpenAuth) {
                  onOpenAuth();
                  return;
                }
                fileInputRef.current?.click();
              }}
              disabled={isUploading}
              className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-[#FAF8F5] text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-[#E6B89C]" />
              <span>Choose Resume File</span>
            </button>
          </div>
        </div>
      ) : (
        /* Populated State */
        <div className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-white border border-[#E7E2DA] gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#EFF5F0] text-[#345B3C] border border-[#D5E4D8] flex items-center justify-center shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4
                  id="resume-filename-full"
                  className="text-sm font-bold text-stone-900 truncate"
                  title={resumeData?.resumeFileName || "Resume"}
                >
                  {resumeData?.resumeFileName || "Resume Document"}
                </h4>
                <div className="text-xs text-stone-500 mt-0.5 flex items-center gap-3 flex-wrap">
                  <span>Uploaded {formatUploadDate(resumeData?.resumeUploadedAt)}</span>
                  <span>•</span>
                  <span>{formatFileSize(resumeData?.resumeFileSize)}</span>
                  <span>•</span>
                  <span className="text-[#345B3C] font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Storage Synced
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                id="view-resume-btn-full"
                onClick={handleViewResume}
                disabled={isUploading || isDeleting}
                className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-[#FAF8F5] text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-[#E6B89C]" />
                <span>View Resume</span>
              </button>

              <button
                id="replace-resume-btn-full"
                onClick={() => replaceInputRef.current?.click()}
                disabled={isUploading || isDeleting}
                className="px-3.5 py-2 rounded-xl border border-[#E0D9CE] bg-white hover:bg-[#F5EFE6] text-stone-800 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-stone-600" />
                <span>Replace Resume</span>
              </button>

              <button
                id="delete-resume-btn-full"
                onClick={() => setIsConfirmingDelete(true)}
                disabled={isUploading || isDeleting || isConfirmingDelete}
                className="px-3.5 py-2 rounded-xl border border-[#F5C2C7] bg-[#FFF6F6] hover:bg-[#FDF2F2] text-[#DC3545] text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Resume</span>
              </button>
            </div>
          </div>

          {/* Delete Confirmation Box */}
          {isConfirmingDelete && (
            <div
              id="delete-confirmation-full"
              className="p-4 rounded-xl bg-[#FFF6F6] border border-[#F5C2C7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in"
            >
              <div>
                <p className="font-bold text-stone-900">
                  Are you sure you want to delete this resume?
                </p>
                <p className="text-stone-600 mt-0.5">
                  This permanently removes the uploaded file from Firebase Storage and unlinks it from your profile.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  id="confirm-delete-full-btn"
                  onClick={handleDeleteResume}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl bg-[#DC3545] hover:bg-[#BB2D3B] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Confirm Delete</span>
                  )}
                </button>
                <button
                  id="cancel-delete-full-btn"
                  onClick={() => setIsConfirmingDelete(false)}
                  disabled={isDeleting}
                  className="px-3.5 py-2 rounded-xl border border-[#DDD5C9] bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
