import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import logo from "/src/assets/common/logo.svg";
import backgroundImage from "../assets/common/Background.png";

import {
  loginUser,
  sendOtp,
  verifyOtp,
  getAllUsers,
  fetchUserProfile,
} from "../redux/slice/authSlice";

function SmoothModal({ visible, message, onClose }) {
  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center
        transition-opacity duration-300 backdrop-blur-sm
        ${
          visible
            ? "opacity-100 bg-black/50"
            : "opacity-0 bg-black/0 pointer-events-none"
        }
      `}
    >
      <div
        className={`relative p-6 w-[22rem] rounded-2xl shadow-2xl 
          bg-gradient-to-br from-white/40 to-white/10 backdrop-blur-xl border border-white/30
          text-center transition-all duration-300 ease-out
          ${
            visible
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 translate-y-10 scale-95"
          }
        `}
      >
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 bg-green-400/40 blur-2xl rounded-full"></div>

        <p className="text-white text-lg font-semibold drop-shadow-sm">
          {message}
        </p>

        <button
          onClick={onClose}
          className="mt-5 py-2 px-8 rounded-full bg-gradient-to-r from-green-400 to-green-500 
          text-white font-semibold shadow-lg hover:shadow-xl 
          hover:scale-[1.03] active:scale-95 transition-all duration-300 cursor-pointer"
        >
          OK
        </button>
      </div>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [modal, setModal] = useState({ show: false, message: "" });

  const openModal = (msg) => {
    setModal({ show: true, message: msg });
  };

  const closeModal = () => {
    setModal({ show: false, message: "" });
  };

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { token, loading, isError, errorMessage } = useSelector(
    (state) => state.auth
  );

  const handleOtpChange = (index, value) => {
    if (/^[0-9]?$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      if (value && index < otp.length - 1) {
        document.getElementById(`otp-${index + 1}`).focus();
      }
    }
  };

  useEffect(() => {
    setOtp(["", "", "", "", "", ""]);
    setOtpSent(false);
    setOtpVerified(false);
  }, [email]);

  const handleGetOtp = async () => {
    if (!email) return openModal("Please enter your email first");
    setOtp(["", "", "", "", "", ""]);
    setOtpSent(false);
    setOtpVerified(false);

    try {
      await dispatch(sendOtp({ email })).unwrap();
      setOtpSent(true);
      openModal("OTP sent to your email");
      setResendTimer(600);
    } catch (err) {
      openModal(err.message || "Failed to send OTP");
    }
  };

  const formatTimer = (seconds) => {
    if (seconds <= 0) return "";
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleVerifyOtp = async () => {
    const enteredOtp = otp.join("");
    if (enteredOtp.length < 6) return openModal("Please enter complete OTP");

    try {
      const result = await dispatch(
        verifyOtp({ email, otp: enteredOtp })
      ).unwrap();

      const token = result.accessToken;
      if (!token) return openModal("Token missing, cannot login");

      setOtpVerified(true);
      setOtp(["", "", "", "", "", ""]);

      await dispatch(fetchUserProfile()).unwrap();
      await dispatch(getAllUsers(token)).unwrap();

      navigate("/dashboard");
    } catch (err) {
      setOtp(["", "", "", "", "", ""]);
      openModal(err.message || "OTP verification failed");
    }
  };

  const handleLogin = async () => {
    const enteredOtp = otp.join("");
    if (!email || enteredOtp.length < 6 || !otpVerified) {
      return alert("Please enter email, complete OTP, and verify it first");
    }

    try {
      await dispatch(loginUser({ email, otp: enteredOtp })).unwrap();
      navigate("/dashboard");
    } catch (err) {
      alert(err.message || "Login failed");
    }
  };

  const handleEmailKeyDown = (e) => {
    if (e.key === "Enter") handleGetOtp();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }
    if (e.key === "Enter") {
      handleVerifyOtp();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();

    let paste = e.clipboardData.getData("text");

    paste = paste.replace(/\D/g, "");
    if (paste.length === 6) {
      const digits = paste.split("");

      setOtp(digits);

      setTimeout(() => {
        document.getElementById("otp-5")?.focus();
      }, 50);
    }
  };

  return (
    <div
      className="relative min-h-screen w-full bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-20">
        <div className="flex items-center gap-2">
          <img src={logo} alt="CropGEN Logo" className="h-14 w-auto" />
          <span className="text-2xl font-semibold text-white">CropGen</span>
        </div>

        <h2 className="text-xl font-medium text-white">
          Welcome To Admin Login
        </h2>
      </div>

      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div className="relative z-10 flex flex-col gap-6 w-[26rem] max-w-md p-6 rounded-2xl shadow-2xl backdrop-blur-md bg-[rgba(255,255,255,0.12)]">
          <p className="text-lg font-medium text-white border-b border-white/40 pb-2 text-center">
            Sign In To Start Your Session
          </p>

          <div className="w-full flex flex-col gap-5">
            {!otpSent && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-white text-sm font-medium">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleEmailKeyDown}
                    placeholder="example@gmail.com"
                    className="w-full p-2 px-4 rounded-full bg-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-green-400 border border-white/30 transition-all duration-500 ease-in-out"
                  />
                </div>

                <button
                  onClick={handleGetOtp}
                  disabled={loading.otp}
                  className="w-full py-2 rounded-full bg-[#28C878] hover:bg-emerald-600 text-white font-semibold transition-all duration-500 ease-in-out cursor-pointer"
                >
                  {loading.otp ? "Sending..." : "Get OTP"}
                </button>
              </>
            )}

            {otpSent && (
              <>
                <label className="text-white text-sm font-medium">
                  Enter OTP
                </label>

                <div className="flex justify-between" onPaste={handleOtpPaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-9 h-9 text-center rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-1 focus:ring-green-400 transition-all duration-500 ease-in-out"
                    />
                  ))}
                </div>

                <button
                  onClick={handleVerifyOtp}
                  disabled={loading.verifyOtp || otpVerified}
                  className="w-full py-2 rounded-full bg-[#28C878] hover:bg-emerald-600 text-white font-semibold transition-all duration-500 ease-in-out cursor-pointer"
                >
                  {loading.verifyOtp ? "Verifying..." : "Verify & Login"}
                </button>

                <button
                  onClick={handleGetOtp}
                  disabled={resendTimer > 0}
                  className="text-sm text-green-400 mt-2 disabled:text-gray-300 transition-all duration-500 ease-in-out cursor-pointer"
                >
                  {resendTimer > 0
                    ? `Resend OTP in ${formatTimer(resendTimer)}`
                    : "Resend OTP"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <SmoothModal
        visible={modal.show}
        message={modal.message}
        onClose={closeModal}
      />
    </div>
  );
}

export default Login;
