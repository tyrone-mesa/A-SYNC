import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import api from "../../api/axios";
import DashboardShell from "../../components/DashboardShell";
import DashboardLoading from "../../components/DashboardLoading";
import CompanyLogo from "../../components/CompanyLogo";
import { X, Upload } from "lucide-react";

const CompanyProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const logoInputRef = useRef(null);
  const [formData, setFormData] = useState({
    companyName: "",
    industry: "",
    description: "",
    website: "",
    address: "",
    contactPerson: "",
    contactPhone: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data } = await api.get("/companies/me");
      setProfile(data.profile);
      setFormData({
        companyName: data.profile.companyName || "",
        industry: data.profile.industry || "",
        description: data.profile.description || "",
        website: data.profile.website || "",
        address: data.profile.address || "",
        contactPerson: data.profile.contactPerson || "",
        contactPhone: data.profile.contactPhone || "",
      });
    } catch (err) {
      setMessage("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setUploading(true);
      const { data } = await api.put("/companies/me", formData);
      setProfile(data.profile);
      setEditing(false);
      setMessage("Profile updated successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setUploading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      e.target.value = "";
      setMessage("Only JPG, JPEG, and PNG files are allowed.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      e.target.value = "";
      setMessage("File size must not exceed 3MB.");
      return;
    }

    try {
      setUploading(true);
      const formDataToSend = new FormData();
      formDataToSend.append("logo", file);

      const { data } = await api.post("/companies/upload-logo", formDataToSend);

      setProfile(data.profile);
      setMessage("Logo uploaded successfully!");
      if (logoInputRef.current) logoInputRef.current.value = "";
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      if (logoInputRef.current) logoInputRef.current.value = "";
      setMessage(err.response?.data?.message || "Failed to upload logo.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!window.confirm("Are you sure you want to delete your logo?")) return;

    try {
      setUploading(true);
      const { data } = await api.delete("/companies/logo");
      setProfile(data.profile);
      setMessage("Logo deleted successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to delete logo.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <DashboardLoading role="company" />;

  return (
    <DashboardShell
      role="company"
      title="Company Profile"
      subtitle="Manage your company information and branding"
    >
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {message}
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Logo Upload Section */}
        <div className="rounded-[24px] border border-black/5 bg-[#f8faf8] p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-navy mb-4">
            Company Logo
          </h2>

          <div className="flex flex-col items-center gap-4">
            {/* Logo Preview */}
            <div className="relative h-32 w-32 rounded-[32px] border-2 border-dashed border-navy/20 bg-white flex items-center justify-center overflow-hidden">
              {profile?.companyUploadedLogo ? (
                <CompanyLogo
                  company={profile}
                  className="h-full w-full"
                  roundedClassName="rounded-none"
                />
              ) : (
                <div className="text-center">
                  <Upload className="h-8 w-8 text-navy/65 mx-auto mb-1" />
                  <p className="text-xs text-navy/65">No logo</p>
                </div>
              )}
            </div>

            {/* Upload Button */}
            <label className="btn-primary w-full text-center cursor-pointer text-sm flex items-center justify-center gap-2">
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : "Upload Logo"}
              <input
                ref={logoInputRef}
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={handleLogoUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>

            {/* Delete Button */}
            {profile?.companyUploadedLogo && (
              <button
                onClick={handleDeleteLogo}
                disabled={uploading}
                className="w-full text-center text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <X className="h-4 w-4" />
                Delete Logo
              </button>
            )}

            {/* Info Text */}
            <p className="text-xs text-navy/65 text-center">
              JPG, JPEG, or PNG • Max 3MB
            </p>
          </div>
        </div>

        {/* Profile Information */}
        <div className="lg:col-span-2 rounded-[24px] border border-black/5 bg-[#f8faf8] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-navy">
              Company Information
            </h2>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-sm font-medium text-[#5E7867] hover:underline"
              >
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="companyprofile-name">
                    Company Name
                  </label>
                  <input
                    id="companyprofile-name"
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="companyprofile-industry">
                    Industry
                  </label>
                  <input
                    id="companyprofile-industry"
                    type="text"
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    placeholder="e.g., Technology, Finance"
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="companyprofile-description">
                  Description
                </label>
                <textarea
                  id="companyprofile-description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="input"
                  placeholder="Tell us about your company..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="companyprofile-website">
                    Website
                  </label>
                  <input
                    id="companyprofile-website"
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://example.com"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="companyprofile-address">
                    Address
                  </label>
                  <input
                    id="companyprofile-address"
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="input"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="companyprofile-contactperson">
                    Contact Person
                  </label>
                  <input
                    id="companyprofile-contactperson"
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="companyprofile-contactphone">
                    Contact Phone
                  </label>
                  <input
                    id="companyprofile-contactphone"
                    type="tel"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleChange}
                    className="input"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={uploading}
                  className="btn-primary flex-1"
                >
                  {uploading ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  disabled={uploading}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy/65">
                  Company Name
                </p>
                <p className="text-sm text-navy">{profile?.companyName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy/65">
                  Industry
                </p>
                <p className="text-sm text-navy">
                  {profile?.industry || "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy/65">
                  Description
                </p>
                <p className="text-sm text-navy">
                  {profile?.description || "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy/65">
                  Website
                </p>
                <p className="text-sm text-navy">
                  {profile?.website ? (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#5E7867] hover:underline"
                    >
                      {profile.website}
                    </a>
                  ) : (
                    "Not specified"
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy/65">
                  Address
                </p>
                <p className="text-sm text-navy">
                  {profile?.address || "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy/65">
                  Contact Person
                </p>
                <p className="text-sm text-navy">
                  {profile?.contactPerson || "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy/65">
                  Contact Phone
                </p>
                <p className="text-sm text-navy">
                  {profile?.contactPhone || "Not specified"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
};

export default CompanyProfile;
