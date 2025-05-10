import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import AuthImagePattern from "../components/AuthImagePattern";
import { MessageSquare, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const VerifyEmailPage = () => {
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOTP, resendOTP } = useAuthStore();

  useEffect(() => {
    // Get email from location state or localStorage
    const storedEmail = localStorage.getItem("verificationEmail");
    if (storedEmail) {
      setEmail(storedEmail);
    } else {
      // If no email found, redirect to signup
      toast.error("Please sign up first");
      navigate("/signup");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setIsVerifying(true);
    try {
      await verifyOTP({ email, otp: otp.trim() });
      localStorage.removeItem("verificationEmail");
      toast.success("Email verified successfully!");
      navigate("/");
    } catch (error) {
      const errorMessage = error.response?.data?.message;
      if (errorMessage === "OTP not found or expired") {
        toast.error("Your OTP has expired. Please request a new one.");
      } else if (errorMessage === "Invalid OTP") {
        toast.error("Invalid OTP. Please check and try again.");
      } else {
        toast.error(errorMessage || "Verification failed. Please try again.");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    setIsResending(true);
    try {
      await resendOTP({ email });
      toast.success("OTP resent successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to resend OTP");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="h-screen grid lg:grid-cols-2">
      {/* Left Side - Form */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mt-2">Verify Your Email</h1>
              <p className="text-base-content/60">
                Enter the OTP sent to {email}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-base-content">
                OTP Code
              </label>
              <div className="mt-1">
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="Enter 6-digit OTP"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isVerifying}
                className="btn btn-primary w-full"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Email"
                )}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={isResending}
                className="text-sm text-primary hover:text-primary/80"
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                    Resending...
                  </>
                ) : (
                  "Didn't receive the code? Resend"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Side - Image Pattern */}
      <div className="block">
        <AuthImagePattern 
          title="Welcome to chatty"
          subtitle="Connect with friends and family in real-time with our secure messaging platform"
        />
      </div>
    </div>
  );
};

export default VerifyEmailPage;