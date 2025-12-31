import { useState, useEffect, useCallback } from "react";
import { FaCheckCircle, FaEdit, FaSave } from "react-icons/fa";
import { MdOutlinePhotoCamera } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import {
  logout,
  fetchUserProfile,
  uploadAvatar,
  updateUser,
} from "../redux/slice/authSlice";
import logoutIcon from "../assets/profile/logout.svg";
import profileImage from "../assets/profile/user-image.jpg";

function Profile() {
  const dispatch = useDispatch();
  const {
    user,
    loading,
    token: authToken,
  } = useSelector((state) => state.auth);

  const [isEditing, setIsEditing] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [animateSuccess, setAnimateSuccess] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    organization: "",
    country: "",
  });

  // Initialize form data when user data changes
  useEffect(() => {
    if (!user) {
      dispatch(fetchUserProfile());
    }
  }, [dispatch]);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        email: user?.email || "",
        phone: `${user?.phone || ""}`,
        organization: user?.organization?.organizationName || "",
        country: user?.organization?.address?.country || "",
      });
    }
  }, [user]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSave = useCallback(() => {
    if (!formData.firstName.trim() || !formData.organization.trim()) {
      alert("First Name and Organization are required");
      return;
    }

    const updatePayload = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      country: formData.country,
    };

    dispatch(
      updateUser({
        token: authToken,
        id: user._id,
        updateData: updatePayload,
      })
    )
      .unwrap()
      .then(() => {
        setIsEditing(false);
        setShowSuccessDialog(true);
        setTimeout(() => setAnimateSuccess(true), 10);

        setTimeout(() => {
          dispatch(fetchUserProfile());
        }, 2000);
      })
      .catch((err) => {
        alert(err?.message || "Failed to update profile");
      });
  }, [dispatch, formData, user]);

  const handleLogout = useCallback(() => setShowLogoutConfirm(true), []);

  const confirmLogout = useCallback(() => {
    dispatch(logout());
    setShowLogoutConfirm(false);
  }, [dispatch]);

  const cancelLogout = useCallback(() => setShowLogoutConfirm(false), []);

  const avatarSrc = user?.avatar ? user.avatar : profileImage;

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    dispatch(
      uploadAvatar({
        file,
        onProgress: (percent) => {
          setUploadProgress(percent);
        },
      })
    )
      .unwrap()
      .then(() => {
        setUploading(false);
        setUploadProgress(0);

        // Auto reload profile after upload
        dispatch(fetchUserProfile());
      })
      .catch(() => {
        setUploading(false);
        setUploadProgress(0);
        alert("Avatar upload failed");
      });
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center bg-cg-bg/95">

    <div className="w-full max-w-4xl px-8 py-6 bg-[#0C2214] rounded-2xl shadow-xl md:shadow-none">
        <h1 className="text-2xl font-semibold text-center mb-6 text-white-900 tracking-tight">
          Profile Settings
        </h1>

        <div className="flex flex-col items-center gap-4 mb-4 ">
          <div className="relative group">
            {/* CLIP CONTAINER */}
            <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-emerald-300 shadow-md">
              <img
                src={avatarSrc}
                alt="Profile"
                className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${
                  uploading ? "opacity-50" : ""
                }`}
                onError={(e) => (e.currentTarget.src = profileImage)}
              />

              {/* UPLOAD PROGRESS OVERLAY */}
              {uploading && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {uploadProgress}%
                  </span>
                </div>
              )}
            </div>

            {/* CAMERA ICON (OUTSIDE CLIP) */}
            <label
              htmlFor="avatarUpload"
              className="absolute bottom-1 right-1 bg-white p-1 rounded-full shadow cursor-pointer"
            >
              <MdOutlinePhotoCamera className="text-xl text-gray-600" />
            </label>

            <input
              type="file"
              id="avatarUpload"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </div>

        {/* Form Section */}
        <form className="space-y-6 " onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="First Name"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              disabled={!isEditing}
              required
            />
            <div className="relative">
              <InputField
                label="Last Name"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                disabled={!isEditing}
              />
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="absolute right-2 top-9 text-gray-500 hover:text-gray-700 transition-colors duration-300 ease-in-out cursor-pointer"
                aria-label={isEditing ? "Save changes" : "Edit profile"}
              >
                {isEditing ? <FaSave /> : <FaEdit />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <VerifiedInputField
              label="Email"
              id="email"
              name="email"
              value={formData.email}
              type="email"
              onChange={handleChange}
              disabled={!isEditing}
            />
            <VerifiedInputField
              label="Phone Number"
              id="phone"
              name="phone"
              value={formData.phone}
              type="tel"
              onChange={handleChange}
              disabled={!isEditing}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="Organization"
              id="organization"
              name="organization"
              value={formData.organization}
              onChange={handleChange}
              disabled={true}
              required
            />
            <InputField
              label="Country"
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              disabled={!isEditing}
              required
            />
          </div>

          {/* Logout Button */}
          <div className="text-center ">
            {!isEditing ? (
              <button
                type="button"
                onClick={handleLogout}
                className="bg-red-600 text-white mx-auto px-6 py-2 rounded-lg font-semibold flex items-center gap-2 justify-center hover:bg-red-700 cursor-pointer transition-all duration-500 ease-in-out"
              >
                <img src={logoutIcon} alt="Logout" className="w-5 h-5" />
                Logout
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                className="bg-green-600 text-white mx-auto px-6 py-2 rounded-lg font-semibold flex items-center gap-2 justify-center hover:bg-green-700 cursor-pointer transition-all duration-500 ease-in-out"
              >
                <FaSave />
                Save
              </button>
            )}
          </div>
        </form>

        {/* Logout Confirmation Dialog */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 backdrop-blur-md bg-[rgba(255,255,255,0.1)]  flex items-center justify-center z-50 ">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
              <h2 className="text-lg font-semibold mb-4">Confirm Logout</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to logout?
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={cancelLogout}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 cursor-pointer transition-all duration-500 ease-in-out"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer transition-all duration-500 ease-in-out"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {showSuccessDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div
              className={`
        bg-white rounded-xl shadow-xl p-6 max-w-sm w-full text-center
        transform transition-all duration-300 ease-out
        ${
          animateSuccess
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4"
        }
      `}
            >
              <div className="flex justify-center mb-3">
                <FaCheckCircle className="text-green-600 text-4xl" />
              </div>

              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                Profile Updated
              </h2>

              <p className="text-gray-600 text-sm mb-6">
                Your profile has been updated successfully.
              </p>

              <button
                onClick={() => {
                  setAnimateSuccess(false);
                  setTimeout(() => setShowSuccessDialog(false), 300);
                }}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all duration-300 ease-in-out cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Reusable Input Field Component
const InputField = ({
  label,
  id,
  name,
  value,
  onChange,
  disabled,
  type = "text",
  required,
}) => (
  <div>
    <label htmlFor={id} className="block text-sm font-semibold text-white/80 mb-1">
      {label}
    </label>
    <input
      id={id}
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="w-full bg-white border border-gray-300 hover:border-emerald-500 focus:border-emerald-700 outline-none px-3 py-2 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed text-black"
      aria-required={required}
    />
  </div>
);

// Reusable Verified Input Field Component
const VerifiedInputField = ({
  label,
  id,
  name,
  value,
  type,
  onChange,
  disabled,
}) => (
  <div>
    <label htmlFor={id} className="block text-sm font-semibold text-white/80 mb-1">
      {label}
    </label>
    <input
      id={id}
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="w-full bg-white border border-gray-300 hover:border-emerald-500 focus:border-emerald-700 outline-none px-3 py-2 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed text-black"
      aria-disabled="true"
    />
    <p className="text-green-500 text-xs flex items-center mt-1">
      <FaCheckCircle className="mr-1" /> Verified
    </p>
  </div>
);

export default Profile;
