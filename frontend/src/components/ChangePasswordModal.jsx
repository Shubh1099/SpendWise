import { useState, useRef, useEffect, useCallback } from "react";
import { X, ArrowLeft, Eye, EyeOff, Check, Loader2 } from "lucide-react";
import { sendOtp, verifyOtpAndChangePassword } from "../api/userApi";
import { useToast } from "../hooks/useToast";

function maskEmail(email) {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (local.length <= 2) return local[0] + "***@" + domain;
  return local[0] + "***" + local[local.length - 1] + "@" + domain;
}

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((step) => (
        <div
          key={step}
          className={`h-2 w-2 rounded-full transition-colors ${
            step < currentStep
              ? "bg-primary"
              : step === currentStep
              ? "bg-primary"
              : "bg-border"
          }`}
        />
      ))}
    </div>
  );
}

function Step1({ email, onSend, loading }) {
  const masked = maskEmail(email);

  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-sm text-text-muted mb-4">
        We'll send a verification code to your registered email.
      </p>
      <div className="rounded-lg bg-background px-4 py-3 mb-6 w-full text-center">
        <span className="text-sm text-text-primary font-medium font-mono">{masked}</span>
      </div>
      <button
        onClick={onSend}
        disabled={loading}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-2"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {loading ? "Sending..." : "Send OTP"}
      </button>
    </div>
  );
}

function Step2({ email, onVerify, onResend }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(300);
  const inputRefs = useRef([]);
  const masked = maskEmail(email);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleChange = (index, value) => {
    if (value.length > 1) {
      // Handle paste
      const pasted = value.replace(/\D/g, "").slice(0, 6);
      if (pasted.length === 6) {
        const newDigits = pasted.split("");
        setDigits(newDigits);
        inputRefs.current[5]?.focus();
        return;
      }
    }
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const allFilled = digits.every((d) => d !== "");
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-sm text-text-muted mb-6">
        Enter the 6-digit code sent to{" "}
        <span className="text-text-primary font-medium">{masked}</span>
      </p>

      <div className="flex gap-2 sm:gap-3 mb-4" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => (inputRefs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="h-12 w-10 sm:w-12 rounded-lg border border-border bg-background text-center text-xl font-semibold text-text-primary focus:border-primary focus:outline-none transition-colors"
            style={{ fontFamily: "Outfit, sans-serif" }}
          />
        ))}
      </div>

      {timeLeft > 0 ? (
        <p className="text-xs text-text-muted mb-6">
          Code expires in{" "}
          <span className="text-text-primary font-medium">
            {minutes}:{seconds.toString().padStart(2, "0")}
          </span>
        </p>
      ) : (
        <button
          onClick={() => {
            onResend();
            setTimeLeft(300);
          }}
          className="text-xs text-primary hover:text-primary/80 mb-6 cursor-pointer"
        >
          Resend Code
        </button>
      )}

      <button
        onClick={() => onVerify(digits.join(""))}
        disabled={!allFilled}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        Verify
      </button>
    </div>
  );
}

function Step3({ otp, onComplete, loading, error }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const checks = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    digit: /\d/.test(newPassword),
  };

  const allValid = Object.values(checks).every(Boolean);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const canSubmit = allValid && passwordsMatch && otp;

  return (
    <div>
      {/* New Password */}
      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium text-text-muted">New Password</label>
        <div className="relative">
          <input
            type={showNew ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-primary focus:outline-none"
            placeholder="Enter new password"
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
          >
            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <div className="mt-2 space-y-1">
          {[
            { key: "length", label: "At least 8 characters" },
            { key: "uppercase", label: "One uppercase letter" },
            { key: "lowercase", label: "One lowercase letter" },
            { key: "digit", label: "One digit" },
          ].map(({ key, label }) => (
            <div
              key={key}
              className={`flex items-center gap-1.5 text-xs ${
                checks[key] ? "text-primary" : "text-text-muted"
              }`}
            >
              {checks[key] ? <Check size={12} /> : <X size={12} />}
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Confirm Password */}
      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium text-text-muted">Confirm Password</label>
        <div className="relative">
          <input
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-primary focus:outline-none"
            placeholder="Confirm new password"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
          >
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {confirmPassword && !passwordsMatch && (
          <p className="mt-1 text-xs text-danger">Passwords do not match</p>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        onClick={() => onComplete(newPassword, confirmPassword)}
        disabled={!canSubmit || loading}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-2"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {loading ? "Changing..." : "Change Password"}
      </button>
    </div>
  );
}

export default function ChangePasswordModal({ open, onClose, email, onLogout }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [storedOtp, setStoredOtp] = useState("");
  const [error, setError] = useState("");
  const toast = useToast();

  const resetState = useCallback(() => {
    setStep(1);
    setLoading(false);
    setStoredOtp("");
    setError("");
  }, []);

  useEffect(() => {
    if (open) resetState();
  }, [open, resetState]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      await sendOtp(email);
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = (otp) => {
    setStoredOtp(otp);
    setStep(3);
  };

  const handleResend = async () => {
    try {
      await sendOtp(email);
      toast.success("New OTP sent to your email");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resend OTP");
    }
  };

  const handleComplete = async (newPassword, confirmNewPassword) => {
    setLoading(true);
    setError("");
    try {
      await verifyOtpAndChangePassword(storedOtp, newPassword, confirmNewPassword);
      onClose();
      toast.success("Password changed successfully. Please log in with your new password.");
      setTimeout(() => onLogout(), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const stepTitles = ["Request OTP", "Enter OTP", "Set New Password"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-md rounded-xl border border-border bg-surface p-5 sm:p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="rounded-lg p-1.5 text-text-muted hover:bg-background hover:text-text-primary cursor-pointer"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <h3 className="text-lg font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
              Change Password
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted hover:bg-background hover:text-text-primary cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-text-muted mb-4">Step {step}: {stepTitles[step - 1]}</p>

        <StepIndicator currentStep={step} />

        {step === 1 && <Step1 email={email} onSend={handleSendOtp} loading={loading} />}
        {step === 2 && <Step2 email={email} onVerify={handleVerify} onResend={handleResend} />}
        {step === 3 && (
          <Step3 otp={storedOtp} onComplete={handleComplete} loading={loading} error={error} />
        )}
      </div>
    </div>
  );
}
