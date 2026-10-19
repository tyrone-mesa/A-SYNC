import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import DashboardShell from "../../components/DashboardShell";
import DashboardLoading from "../../components/DashboardLoading";

const ManageCompanies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [search, setSearch] = useState("");

  const filteredCompanies = companies.filter((company) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [company.companyName, company.user?.email, company.industry]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });

  const loadCompanies = () => {
    setLoading(true);
    api
      .get("/admin/companies")
      .then(({ data }) => setCompanies(data.companies))
      .finally(() => setLoading(false));
  };

  useEffect(loadCompanies, []);

  const setVerified = async (id, isVerified) => {
    await api.put(`/admin/companies/${id}/verify`, { isVerified });
    loadCompanies();
  };

  const startEdit = (company) => {
    setEditingId(company._id);
    setEditForm({
      companyName: company.companyName,
      industry: company.industry,
      description: company.description,
      website: company.website,
      address: company.address,
      contactPerson: company.contactPerson,
      contactPhone: company.contactPhone,
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveEdit = async () => {
    try {
      await api.put(`/admin/companies/${editingId}`, editForm);
      setEditingId(null);
      loadCompanies();
      alert("Company updated successfully!");
    } catch (err) {
      alert(
        "Failed to update company: " + err.response?.data?.message ||
          err.message,
      );
    }
  };

  const deleteCompany = async (id, companyName) => {
    if (
      !window.confirm(
        `Archive "${companyName}"? Their account will be disabled, open jobs will be hidden, and their data will remain available in Archive.`,
      )
    ) {
      return;
    }
    try {
      await api.delete(`/admin/companies/${id}`);
      loadCompanies();
      alert("Company archived successfully!");
    } catch (err) {
      alert(
        "Failed to archive company: " + err.response?.data?.message ||
          err.message,
      );
    }
  };

  const renderEditForm = (c) => (
                <div className="py-4 px-4 bg-white rounded-lg border border-navy/10">
                  <h3 className="font-medium text-navy mb-4">
                    Edit Company: {c.companyName}
                  </h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      name="companyName"
                      value={editForm.companyName}
                      onChange={handleEditChange}
                      placeholder="Company Name"
                      className="w-full px-3 py-2 border border-navy/20 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold"
                    />
                    <input
                      type="text"
                      name="industry"
                      value={editForm.industry}
                      onChange={handleEditChange}
                      placeholder="Industry"
                      className="w-full px-3 py-2 border border-navy/20 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold"
                    />
                    <textarea
                      name="description"
                      value={editForm.description}
                      onChange={handleEditChange}
                      placeholder="Description"
                      rows="3"
                      className="w-full px-3 py-2 border border-navy/20 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold"
                    />
                    <input
                      type="text"
                      name="website"
                      value={editForm.website}
                      onChange={handleEditChange}
                      placeholder="Website"
                      className="w-full px-3 py-2 border border-navy/20 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold"
                    />
                    <input
                      type="text"
                      name="address"
                      value={editForm.address}
                      onChange={handleEditChange}
                      placeholder="Address"
                      className="w-full px-3 py-2 border border-navy/20 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold"
                    />
                    <input
                      type="text"
                      name="contactPerson"
                      value={editForm.contactPerson}
                      onChange={handleEditChange}
                      placeholder="Contact Person"
                      className="w-full px-3 py-2 border border-navy/20 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold"
                    />
                    <input
                      type="text"
                      name="contactPhone"
                      value={editForm.contactPhone}
                      onChange={handleEditChange}
                      placeholder="Contact Phone"
                      className="w-full px-3 py-2 border border-navy/20 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold"
                    />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={saveEdit}
                      className="px-4 py-2 bg-forest text-white rounded-lg text-sm font-medium hover:brightness-90"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 bg-navy/10 text-navy rounded-lg text-sm font-medium hover:bg-navy/20"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
  );

  if (loading) return <DashboardLoading role="admin" />;

  return (
    <DashboardShell
      role="admin"
      title="Verify Companies"
      subtitle="Approve corporate partners so their OJT postings become publicly visible."
      actions={
        <Link
          to="/register"
          state={{ from: "admin-companies" }}
          className="rounded-full border border-forest/20 bg-[#dfeecf] px-4 py-2 text-sm font-medium text-[#5E7867] shadow-sm transition hover:brightness-95"
        >
          + Add Company
        </Link>
      }
    >
      <div className="mb-5 rounded-2xl border border-white/30 bg-white/25 p-3 backdrop-blur-md">
        <input
          type="search"
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`input-field bg-white/60 py-2.5 ${
            /^\d+$/.test(search.trim()) ? "numeric-value" : ""
          }`}
          aria-label="Search companies"
        />
      </div>
      <div className="space-y-3 md:hidden">
        {filteredCompanies.map((c) =>
          editingId === c._id ? (
            <div key={c._id}>{renderEditForm(c)}</div>
          ) : (
            <article
              key={c._id}
              className="space-y-3 rounded-2xl border border-white/35 bg-white/60 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 break-words font-semibold text-navy">
                  {c.companyName}
                </p>
                <span
                  className={`shrink-0 inline-flex text-xs font-bold ${
                    c.isVerified ? "text-[#5E7867]" : "text-navy/50"
                  }`}
                >
                  {c.isVerified ? "Verified" : "Pending"}
                </span>
              </div>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
                <dt className="font-medium text-navy/65">Email</dt>
                <dd className="min-w-0 break-all text-right text-navy/75">
                  {c.user?.email || "-"}
                </dd>
                <dt className="font-medium text-navy/65">Industry</dt>
                <dd className="min-w-0 break-words text-right text-navy/75">
                  {c.industry || "Industry not set"}
                </dd>
              </dl>
              <div className="flex flex-wrap gap-2 border-t border-black/5 pt-3">
                <Link
                  to={`/admin/companies/${c._id}`}
                  className="btn-secondary px-3 py-2 text-xs"
                >
                  View Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => startEdit(c)}
                  className="btn-secondary px-3 py-2 text-xs"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setVerified(c._id, !c.isVerified)}
                  className="btn-secondary px-3 py-2 text-xs"
                >
                  {c.isVerified ? "Revoke" : "Approve"}
                </button>
                <button
                  type="button"
                  onClick={() => deleteCompany(c._id, c.companyName)}
                  className="btn-secondary px-3 py-2 text-xs text-[#DF2E1B]"
                >
                  Archive
                </button>
              </div>
            </article>
          ),
        )}
        {filteredCompanies.length === 0 && (
          <p className="rounded-2xl border border-white/35 bg-white/60 p-6 text-center text-sm text-navy/65">
            {companies.length === 0
              ? "No companies yet."
              : "No companies match your search."}
          </p>
        )}
      </div>
      <div className="row-shell hidden rounded-[24px] border border-black/5 bg-[#f8faf8] p-4 shadow-sm md:block">
        <div className="row-list divide-y divide-black/10">
          {filteredCompanies.length === 0 && (
            <div className="p-8 text-center text-navy/65">
              {companies.length === 0
                ? "No companies yet."
                : "No companies match your search."}
            </div>
          )}
          {filteredCompanies.map((c) => (
            <div key={c._id}>
              {editingId === c._id ? (
                renderEditForm(c)
              ) : (
                // Company Row
                <div className="row-item flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-3 sm:block">
                      <p className="row-title font-medium text-navy">{c.companyName}</p>
                      <p className="row-sub truncate text-xs text-navy/65 sm:hidden">
                        {c.user?.email}
                      </p>
                    </div>
                    <p className="hidden text-sm text-navy/65 sm:block">
                      {c.user?.email} · {c.industry || "Industry not set"}
                    </p>
                  </div>
                  <div className="row-actions flex flex-wrap items-center gap-2 sm:gap-3 sm:shrink-0">
                    <span
                      className={c.isVerified ? "row-status text-sm font-bold text-[#5E7867]" : "row-status text-sm font-bold text-navy/50"}
                    >
                      {c.isVerified ? "Verified" : "Pending"}
                    </span>
                    <Link
                      to={`/admin/companies/${c._id}`}
                      className="row-action text-xs font-medium text-[#457D53] hover:underline"
                    >
                      View Dashboard
                    </Link>
                    <button
                      onClick={() => startEdit(c)}
                      className="row-action text-xs font-medium text-blue-700 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteCompany(c._id, c.companyName)}
                      className="row-action text-xs font-medium text-red-700 hover:underline"
                    >
                      Archive
                    </button>
                    <button
                      onClick={() => setVerified(c._id, !c.isVerified)}
                      className="row-action text-xs font-medium text-[#5E7867] hover:underline"
                    >
                      {c.isVerified ? "Revoke" : "Approve"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
};

export default ManageCompanies;
