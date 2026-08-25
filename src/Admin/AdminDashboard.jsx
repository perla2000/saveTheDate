import axios from "axios";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { API_ENDPOINTS } from "../config/api";
import API_BASE_URL from "../config/api";
import { useBranding } from "../context/BrandingContext";
import BrandingTab from "./BrandingTab";

const AdminDashboard = ({ onLogout, clientConfig }) => {
  const [activeTab, setActiveTab] = useState("rsvp");
  const branding = useBranding();

  // ── Import tab state ──────────────────────────────────────────────────────
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState("");

  // ── RSVP viewer state ─────────────────────────────────────────────────────
  const [families, setFamilies] = useState([]);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [rsvpError, setRsvpError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | yes | no | pending

  // ── Edit family modal state ───────────────────────────────────────────────
  const [editingFamily, setEditingFamily] = useState(null); // { _id, attendees, giftRegistry }
  const [editAttendees, setEditAttendees] = useState([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // ── Delete confirmation state ─────────────────────────────────────────────
  const [deletingFamilyId, setDeletingFamilyId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Financials tab state (server-backed, persists across portals) ─────────
  const FIN_SECTIONS = {
    cyprus: { label: "Cyprus Wedding" },
    lebanon: { label: "Lebanon Wedding" },
    gifts: { label: "Gifts" },
  };

  const [finSubTab, setFinSubTab] = useState("cyprus");
  const [finLoading, setFinLoading] = useState(false);
  const [finCurrency, setFinCurrency] = useState("USD");

  // Data per section
  const [expenses, setExpenses] = useState([]);
  const [expLebanon, setExpLebanon] = useState([]);
  const [gifts, setGifts] = useState([]);

  const [expError, setExpError] = useState("");
  const [expForm, setExpForm] = useState(null);
  const [deletingExpId, setDeletingExpId] = useState(null);
  const [giftForm, setGiftForm] = useState(null);
  const [deletingGiftId, setDeletingGiftId] = useState(null);

  const EMPTY_EXPENSE = {
    name: "",
    amount: "",
    currency: "USD",
    status: "unpaid",
    notes: "",
    category: "",
    dueDate: "",
    paidDate: "",
    vendorId: "",
  };
  const EMPTY_GIFT = {
    from: "",
    description: "",
    amount: "",
    received: true,
    thankYouSent: false,
    notes: "",
  };

  // Helpers to get/set the right state for the active section
  const sectionData = { cyprus: expenses, lebanon: expLebanon, gifts };
  const sectionSetters = {
    cyprus: setExpenses,
    lebanon: setExpLebanon,
    gifts: setGifts,
  };
  const activeExpenses =
    finSubTab === "gifts" ? [] : sectionData[finSubTab] || [];

  const fetchSection = async (section) => {
    setFinLoading(true);
    setExpError("");
    try {
      const res = await axios.get(API_ENDPOINTS.GET_FIN(section));
      sectionSetters[section](Array.isArray(res.data) ? res.data : []);
    } catch {
      setExpError(`Could not load ${section} data.`);
    } finally {
      setFinLoading(false);
    }
  };

  const handleExpSave = async () => {
    if (!expForm?.name?.trim() || expForm?.amount === "") return;
    try {
      if (expForm.id) {
        const res = await axios.put(
          API_ENDPOINTS.UPDATE_FIN(finSubTab, expForm.id),
          expForm,
        );
        sectionSetters[finSubTab]((prev) =>
          prev.map((e) => (e.id === expForm.id ? res.data : e)),
        );
      } else {
        const res = await axios.post(
          API_ENDPOINTS.CREATE_FIN(finSubTab),
          expForm,
        );
        sectionSetters[finSubTab]((prev) => [...prev, res.data]);
      }
      setExpForm(null);
    } catch {
      setExpError("Failed to save expense.");
    }
  };

  const handleExpDelete = async () => {
    try {
      await axios.delete(API_ENDPOINTS.DELETE_FIN(finSubTab, deletingExpId));
      sectionSetters[finSubTab]((prev) =>
        prev.filter((e) => e.id !== deletingExpId),
      );
    } catch {
      setExpError("Failed to delete.");
    } finally {
      setDeletingExpId(null);
    }
  };

  const handleGiftSave = async () => {
    const resolvedFrom =
      giftForm.from === "__other__"
        ? (giftForm.fromCustom || "").trim()
        : giftForm.from;
    if (!resolvedFrom) return;
    const payload = { ...giftForm, from: resolvedFrom };
    delete payload.fromCustom;
    try {
      if (giftForm.id) {
        const res = await axios.put(
          API_ENDPOINTS.UPDATE_FIN("gifts", giftForm.id),
          payload,
        );
        setGifts((prev) =>
          prev.map((g) => (g.id === giftForm.id ? res.data : g)),
        );
      } else {
        const res = await axios.post(
          API_ENDPOINTS.CREATE_FIN("gifts"),
          payload,
        );
        setGifts((prev) => [...prev, res.data]);
      }
      setGiftForm(null);
    } catch {
      setExpError("Failed to save gift.");
    }
  };

  const handleGiftDelete = async () => {
    try {
      await axios.delete(API_ENDPOINTS.DELETE_FIN("gifts", deletingGiftId));
      setGifts((prev) => prev.filter((g) => g.id !== deletingGiftId));
    } catch {
      setExpError("Failed to delete.");
    } finally {
      setDeletingGiftId(null);
    }
  };

  // ── Export helpers ───────────────────────────────────────────────────────
  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "";
  const fmtAmt = (n) => (n != null ? parseFloat(n) : "");

  const handleExportFinancialsExcel = () => {
    const expenseCols = (rows, wedding) =>
      rows.map((e, i) => ({
        "#": i + 1,
        Wedding: wedding,
        Name: e.name,
        Category: e.category || "",
        Vendor: vendors.find((v) => v.id === e.vendorId)?.name || "",
        Amount: fmtAmt(e.amount),
        Status: e.status === "paid" ? "Paid" : "Unpaid",
        "Due Date": fmtDate(e.dueDate),
        "Payment Date": fmtDate(e.paidDate),
        Notes: e.notes || "",
      }));

    const allExpRows = [
      ...expenseCols(expenses, "Cyprus"),
      ...expenseCols(expLebanon, "Lebanon"),
    ];

    const giftRows = gifts.map((g, i) => ({
      "#": i + 1,
      From: g.from,
      Description: g.description || "",
      Amount: fmtAmt(g.amount),
      Received: g.received ? "Yes" : "No",
      "Thank You Sent": g.thankYouSent ? "Yes" : "Pending",
      Notes: g.notes || "",
    }));

    const wb = XLSX.utils.book_new();

    const wsExp = XLSX.utils.json_to_sheet(allExpRows);
    wsExp["!cols"] = [
      { wch: 4 },
      { wch: 10 },
      { wch: 26 },
      { wch: 16 },
      { wch: 22 },
      { wch: 10 },
      { wch: 9 },
      { wch: 14 },
      { wch: 14 },
      { wch: 28 },
    ];
    XLSX.utils.book_append_sheet(wb, wsExp, "Expenses");

    const wsGifts = XLSX.utils.json_to_sheet(giftRows);
    wsGifts["!cols"] = [
      { wch: 4 },
      { wch: 22 },
      { wch: 20 },
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
      { wch: 28 },
    ];
    XLSX.utils.book_append_sheet(wb, wsGifts, "Gifts");

    XLSX.writeFile(
      wb,
      `financials-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  const handleExportTablesExcel = () => {
    const rows = tables.map((tbl, i) => ({
      "#": i + 1,
      "Table Name": tbl.name,
      "Max Seats": tbl.seats || "",
      "Assigned Guests": (tbl.guests || []).join(", "),
      "Guest Count": (tbl.guests || []).length,
      Notes: tbl.notes || "",
    }));

    // Second sheet: flat guest ↔ table list for seating charts
    const flat = tables
      .flatMap((tbl) =>
        (tbl.guests || []).map((g) => ({ "Guest Name": g, Table: tbl.name })),
      )
      .sort((a, b) => a["Guest Name"].localeCompare(b["Guest Name"]));

    const wb = XLSX.utils.book_new();

    const wsTables = XLSX.utils.json_to_sheet(rows);
    wsTables["!cols"] = [
      { wch: 4 },
      { wch: 22 },
      { wch: 11 },
      { wch: 50 },
      { wch: 13 },
      { wch: 28 },
    ];
    XLSX.utils.book_append_sheet(wb, wsTables, "Tables");

    const wsSeating = XLSX.utils.json_to_sheet(flat);
    wsSeating["!cols"] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSeating, "Guest Seating");

    XLSX.writeFile(wb, `tables-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportFloorPlanPDF = async () => {
    if (!floorPlanRef.current) {
      console.error("Floor plan ref not available");
      alert("Floor plan is not ready. Please try again.");
      return;
    }

    // Temporarily switch to floor plan view if not already there
    const wasInListMode = !floorPlanMode;
    if (wasInListMode) setFloorPlanMode(true);

    // Give React a tick to render the floor plan before capturing
    await new Promise((r) => setTimeout(r, 300));

    try {
      console.log("Starting PDF export...");
      const canvas = await html2canvas(floorPlanRef.current, {
        backgroundColor: "#f9f6f7",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      console.log("Canvas created, generating PDF...");
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const usableW = pageW - margin * 2;
      const usableH = pageH - margin * 2 - 14; // space for title
      const imgAspect = canvas.width / canvas.height;
      let drawW = usableW;
      let drawH = drawW / imgAspect;
      if (drawH > usableH) {
        drawH = usableH;
        drawW = drawH * imgAspect;
      }

      // Title
      const dateStr = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(80, 30, 40);
      pdf.text("Floor Plan", margin, margin + 7);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(140, 120, 125);
      pdf.text(dateStr, pageW - margin, margin + 7, { align: "right" });

      // Thin rule below title
      pdf.setDrawColor(200, 185, 190);
      pdf.setLineWidth(0.3);
      pdf.line(margin, margin + 10, pageW - margin, margin + 10);

      // Floor plan image
      pdf.addImage(imgData, "PNG", margin, margin + 14, drawW, drawH);

      // Table legend at bottom
      const legendY = margin + 14 + drawH + 5;
      if (legendY + 8 < pageH) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.setTextColor(80, 30, 40);
        pdf.text(
          `${tables.length} table${tables.length !== 1 ? "s" : ""}  ·  ${tables.reduce((s, t) => s + (t.guests || []).length, 0)} guests assigned`,
          margin,
          legendY + 4,
        );
      }

      console.log("Saving PDF...");
      pdf.save(`floor-plan-${new Date().toISOString().slice(0, 10)}.pdf`);
      console.log("PDF export complete");
    } catch (error) {
      console.error("PDF export failed:", error);
      alert(`Failed to export PDF: ${error.message}`);
    } finally {
      if (wasInListMode) setFloorPlanMode(false);
    }
  };

  // Totals
  const totalExpenses = activeExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalPaid = activeExpenses
    .filter((e) => e.status === "paid")
    .reduce((s, e) => s + (e.amount || 0), 0);
  const totalUnpaid = totalExpenses - totalPaid;
  const totalCyprus = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalLebanon = expLebanon.reduce((s, e) => s + (e.amount || 0), 0);
  const totalGifts = gifts
    .filter((g) => g.amount)
    .reduce((s, g) => s + (g.amount || 0), 0);

  // All expenses from both weddings — used by vendor linking
  const allExpenses = [...expenses, ...expLebanon];

  // Per-vendor totals derived from linked expenses
  const vendorTotals = (vendorId) => {
    const linked = allExpenses.filter((e) => e.vendorId === vendorId);
    const total = linked.reduce((s, e) => s + (e.amount || 0), 0);
    const paid = linked
      .filter((e) => e.status === "paid")
      .reduce((s, e) => s + (e.amount || 0), 0);
    return { linked, total, paid, remaining: total - paid };
  };

  const fmt = (n, cur) =>
    new Intl.NumberFormat((cur || finCurrency) === "EUR" ? "de-DE" : "en-US", {
      style: "currency",
      currency: cur || finCurrency,
    }).format(n);
  const fmtExp = (exp) => fmt(exp.amount, exp.currency);

  // ── Tables tab state ──────────────────────────────────────────────────────
  const [tables, setTables] = useState([]);
  const [tableForm, setTableForm] = useState(null);
  const [deletingTableId, setDeletingTableId] = useState(null);
  const [floorPlanMode, setFloorPlanMode] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const floorPlanRef = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const EMPTY_TABLE = {
    name: "",
    seats: "",
    shape: "round",
    priority: 3,
    notes: "",
    guests: [],
    position: null,
  };

  const PRIORITY_COLORS = [
    "",
    "#c92a2a",
    "#e67700",
    "#2b8a3e",
    "#1971c2",
    "#868e96",
  ];
  const PRIORITY_LABELS = [
    "",
    "P1 · VIP",
    "P2 · High",
    "P3 · Normal",
    "P4 · Low",
    "P5 · Filler",
  ];

  const startDrag = (e, tbl) => {
    e.preventDefault();
    const rect = floorPlanRef.current.getBoundingClientRect();
    const pos = tbl.position || { x: 0, y: 0 };
    dragOffset.current = {
      x: e.clientX - rect.left - pos.x,
      y: e.clientY - rect.top - pos.y,
    };
    setDraggingId(tbl.id);
  };

  const onFloorMove = (e) => {
    if (!draggingId || !floorPlanRef.current) return;
    const rect = floorPlanRef.current.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(e.clientX - rect.left - dragOffset.current.x, rect.width - 120),
    );
    const y = Math.max(
      0,
      Math.min(e.clientY - rect.top - dragOffset.current.y, rect.height - 80),
    );
    setTables((prev) =>
      prev.map((t) => (t.id === draggingId ? { ...t, position: { x, y } } : t)),
    );
  };

  const endDrag = async () => {
    if (!draggingId) return;
    const tbl = tables.find((t) => t.id === draggingId);
    if (tbl)
      await axios
        .put(API_ENDPOINTS.UPDATE_FIN("tables", tbl.id), tbl)
        .catch(() => {});
    setDraggingId(null);
  };

  // ── To-Dos tab state ──────────────────────────────────────────────────────
  const [todos, setTodos] = useState([]);
  const [todoForm, setTodoForm] = useState(null); // null | { id?, title, dueDate, assignee, status, notes }
  const [deletingTodoId, setDeletingTodoId] = useState(null);
  const EMPTY_TODO = {
    title: "",
    dueDate: "",
    assignee: "",
    status: "pending",
    notes: "",
  };

  // ── Vendors tab state ─────────────────────────────────────────────────────
  const [vendors, setVendors] = useState([]);
  const [vendorForm, setVendorForm] = useState(null); // null | { id?, name, type, status, contact, price, notes }
  const [deletingVendorId, setDeletingVendorId] = useState(null);
  const [expandedVendorId, setExpandedVendorId] = useState(null);
  const VENDOR_TYPES = [
    "Venue",
    "Flowers",
    "DJ / Music",
    "Makeup",
    "Photography",
    "Videography",
    "Catering",
    "Cake",
    "Dress / Attire",
    "Transport",
    "Decoration",
    "Other",
  ];
  const EMPTY_VENDOR = {
    name: "",
    type: "",
    status: "not-booked",
    contact: "",
    price: "",
    notes: "",
  };

  // Generic fetch / CRUD helpers for simple tabs
  const fetchSimple = async (section, setter) => {
    try {
      const res = await axios.get(API_ENDPOINTS.GET_FIN(section));
      setter(Array.isArray(res.data) ? res.data : []);
    } catch {
      /* silent */
    }
  };

  const saveSimple = async (section, form, setter, setForm) => {
    try {
      if (form.id) {
        const res = await axios.put(
          API_ENDPOINTS.UPDATE_FIN(section, form.id),
          form,
        );
        setter((prev) => prev.map((x) => (x.id === form.id ? res.data : x)));
      } else {
        const res = await axios.post(API_ENDPOINTS.CREATE_FIN(section), form);
        setter((prev) => [...prev, res.data]);
      }
      setForm(null);
    } catch {
      /* silent */
    }
  };

  const deleteSimple = async (section, id, setter, setDeletingId) => {
    try {
      await axios.delete(API_ENDPOINTS.DELETE_FIN(section, id));
      setter((prev) => prev.filter((x) => x.id !== id));
    } catch {
      /* silent */
    } finally {
      setDeletingId(null);
    }
  };

  // ── Create family tab state ───────────────────────────────────────────────
  const [createGuests, setCreateGuests] = useState([{ name: "" }]);
  const [createGiftRegistry, setCreateGiftRegistry] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createResult, setCreateResult] = useState(null);

  // ── Invite modal state ────────────────────────────────────────────────────
  const [invitingFamilyId, setInvitingFamilyId] = useState(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteEditing, setInviteEditing] = useState(false);
  const [invitePhoto, setInvitePhoto] = useState(null);

  const openInviteModal = (familyId) => {
    setInvitingFamilyId(familyId);
    setInviteMessage(buildInviteMessage(familyId));
    setInviteEditing(false);
    setInvitePhoto(null);
    setInviteCopied(false);
  };

  const closeInviteModal = () => {
    setInvitingFamilyId(null);
    setInviteMessage("");
    setInviteEditing(false);
    setInvitePhoto(null);
    setInviteCopied(false);
  };

  const handleShareWhatsApp = async () => {
    if (invitePhoto && navigator.canShare?.({ files: [invitePhoto] })) {
      try {
        await navigator.share({ text: inviteMessage, files: [invitePhoto] });
        return;
      } catch (err) {
        if (err.name !== "AbortError") {
          window.open(
            `https://wa.me/?text=${encodeURIComponent(inviteMessage)}`,
            "_blank",
            "noopener,noreferrer",
          );
        }
        return;
      }
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(inviteMessage)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  useEffect(() => {
    if (activeTab === "rsvp") fetchFamilies();
    if (activeTab === "financials") {
      fetchSection("cyprus");
      fetchSection("lebanon");
      fetchSection("gifts");
      fetchSimple("vendors", setVendors); // needed for the vendor dropdown in expense form
    }
    if (activeTab === "tables") fetchSimple("tables", setTables);
    if (activeTab === "todos") fetchSimple("todos", setTodos);
    if (activeTab === "vendors") {
      fetchSimple("vendors", setVendors);
      fetchSection("cyprus"); // needed to compute vendor totals
      fetchSection("lebanon");
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchFamilies = async () => {
    setRsvpLoading(true);
    setRsvpError("");
    try {
      const res = await axios.get(API_ENDPOINTS.GET_ALL_FAMILIES());
      setFamilies(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setRsvpError("Could not load families. Is the server running?");
    } finally {
      setRsvpLoading(false);
    }
  };

  // ── Edit family ───────────────────────────────────────────────────────────
  const openEditModal = (family) => {
    setEditingFamily(family);
    setEditAttendees((family.attendees || []).map((a) => ({ ...a })));
    setEditError("");
  };

  const closeEditModal = () => {
    setEditingFamily(null);
    setEditAttendees([]);
    setEditError("");
  };

  const handleEditAttendeeName = (index, value) => {
    setEditAttendees((prev) =>
      prev.map((a, i) => (i === index ? { ...a, name: value } : a)),
    );
  };

  const handleEditAttendeeAttending = (index, value) => {
    setEditAttendees((prev) =>
      prev.map((a, i) => (i === index ? { ...a, attending: value } : a)),
    );
  };

  const handleAddAttendeeToEdit = () => {
    setEditAttendees((prev) => [
      ...prev,
      { name: "", attending: null, guestId: prev.length + 1 },
    ]);
  };

  const handleRemoveAttendeeFromEdit = (index) => {
    setEditAttendees((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveEdit = async () => {
    const invalid = editAttendees.some((a) => !a.name.trim());
    if (invalid) {
      setEditError("All guest names must be filled in.");
      return;
    }
    if (editAttendees.length === 0) {
      setEditError("A family must have at least one guest.");
      return;
    }
    setEditSaving(true);
    setEditError("");
    try {
      await axios.put(API_ENDPOINTS.UPDATE_FAMILY(editingFamily._id), {
        attendees: editAttendees.map((a, i) => ({
          guestId: a.guestId ?? i + 1,
          name: a.name.trim(),
          attending: a.attending,
        })),
        giftRegistry: editingFamily.giftRegistry,
      });
      await fetchFamilies();
      closeEditModal();
    } catch (err) {
      setEditError("Failed to save changes. Please try again.");
    } finally {
      setEditSaving(false);
    }
  };

  // ── Delete family ─────────────────────────────────────────────────────────
  const handleDeleteFamily = async () => {
    if (!deletingFamilyId) return;
    setDeleteLoading(true);
    try {
      await axios.delete(API_ENDPOINTS.DELETE_FAMILY(deletingFamilyId));
      setFamilies((prev) => prev.filter((f) => f._id !== deletingFamilyId));
    } catch (err) {
      setRsvpError("Failed to delete family. Please try again.");
    } finally {
      setDeleteLoading(false);
      setDeletingFamilyId(null);
    }
  };

  // ── Invite helper ─────────────────────────────────────────────────────────
  const buildInviteMessage = (familyId) => {
    // Calculate dates
    const rawDate  = branding?.weddingDate || clientConfig?.weddingDate || "";
    const rsvpUrl  = clientConfig?.rsvpUrl || "https://sparklink.cards";

    let weddingDateStr = "our wedding day";
    let confirmDateStr = "one month before";
    if (rawDate) {
      const d = new Date(rawDate);
      weddingDateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      const confirm = new Date(d);
      confirm.setMonth(confirm.getMonth() - 1);
      confirmDateStr = confirm.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    }

    const coupleName = branding?.coupleName || clientConfig?.coupleName || "Justin & Yara";
    const link = `${rsvpUrl}/?familyId=${familyId}`;

    // Use custom template if set, otherwise use default
    const template = branding?.inviteMessageTemplate ||
      `We're so happy to share this special moment with you 🤍\n\nOur big day is on {weddingDate}, and it would truly mean the world to us to have you there. \n\nPlease find our invitation card at the link below for all the details.\nWe really hope you can join us on this unforgettable day!\n\n{rsvpUrl}/?familyId={familyId}\n\nPlease confirm before {confirmDate}  🤍`;

    return template
      .replace(/{coupleName}/g, coupleName)
      .replace(/{weddingDate}/g, weddingDateStr)
      .replace(/{confirmDate}/g, confirmDateStr)
      .replace(/{rsvpUrl}/g, rsvpUrl)
      .replace(/{familyId}/g, familyId)
      .replace(/{link}/g, link);
  };

  const openWhatsApp = (familyId) => { // eslint-disable-line no-unused-vars
    const msg = buildInviteMessage(familyId);
    window.open(
      `https://wa.me/?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  // ── Create family ─────────────────────────────────────────────────────────
  const handleCreateGuestName = (index, value) => {
    setCreateGuests((prev) =>
      prev.map((g, i) => (i === index ? { name: value } : g)),
    );
  };

  const handleAddCreateGuest = () => {
    setCreateGuests((prev) => [...prev, { name: "" }]);
  };

  const handleRemoveCreateGuest = (index) => {
    if (createGuests.length === 1) return;
    setCreateGuests((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateFamily = async () => {
    const invalid = createGuests.some((g) => !g.name.trim());
    if (invalid) {
      setCreateError("All guest names must be filled in.");
      return;
    }
    setCreateLoading(true);
    setCreateError("");
    setCreateResult(null);
    try {
      const res = await axios.post(API_ENDPOINTS.CREATE_FAMILY(), {
        attendees: createGuests.map((g, i) => ({
          guestId: i + 1,
          name: g.name.trim(),
          attending: null,
        })),
        giftRegistry: createGiftRegistry,
      });
      const newFamily = res.data;
      const rsvpUrl = `${clientConfig?.rsvpUrl || "https://sparklink.cards"}/?familyId=${newFamily._id}`;
      setCreateResult({ family: newFamily, rsvpUrl });
      setCreateGuests([{ name: "" }]);
      setCreateGiftRegistry(true);
    } catch (err) {
      setCreateError("Failed to create family. Please try again.");
    } finally {
      setCreateLoading(false);
    }
  };

  // Flatten families → rows for display
  // If createdAt === updatedAt the family was never edited → treat as pending
  const allRows = families.flatMap((fam) => {
    const isPending =
      fam.createdAt &&
      fam.updatedAt &&
      new Date(fam.createdAt).getTime() === new Date(fam.updatedAt).getTime();

    return (fam.attendees || []).map((att) => ({
      familyId: fam._id,
      familyName: fam.familyName || fam._id,
      name: att.name,
      attending: isPending ? null : att.attending,
      updatedAt: fam.updatedAt,
    }));
  });

  const filteredRows = allRows.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "yes" && r.attending === true) ||
      (filter === "no" && r.attending === false) ||
      (filter === "pending" && r.attending === null);
    return matchesSearch && matchesFilter;
  });

  const totalYes = allRows.filter((r) => r.attending === true).length;
  const totalNo = allRows.filter((r) => r.attending === false).length;
  const totalPending = allRows.filter((r) => r.attending === null).length;

  const handleExportAttendingExcel = () => {
    const attending = allRows.filter((r) => r.attending === true);
    const rows = attending.map((r, i) => ({
      "#": i + 1,
      "Guest Name": r.name,
      "RSVP Date": r.updatedAt
        ? new Date(r.updatedAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 5 }, { wch: 32 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attending Guests");
    XLSX.writeFile(
      wb,
      `attending-guests-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];

    if (!selectedFile) {
      setFile(null);
      setParsedData(null);
      setPreviewData(null);
      return;
    }

    // Validate file type
    if (!selectedFile.name.toLowerCase().endsWith(".xlsx")) {
      setError("Please select a valid .xlsx file");
      return;
    }

    setFile(selectedFile);
    setError("");
    setImportResult(null);

    // Parse the Excel file
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length === 0) {
          setError("The Excel file is empty");
          return;
        }

        // Check for required headers
        const headers = jsonData[0];
        const requiredHeaders = ["guest name", "family name"];
        const missingHeaders = requiredHeaders.filter(
          (header) =>
            !headers.some(
              (h) =>
                h && h.toString().toLowerCase().trim() === header.toLowerCase(),
            ),
        );

        if (missingHeaders.length > 0) {
          setError(`Missing required columns: ${missingHeaders.join(", ")}`);
          return;
        }

        // Find column indices dynamically
        const headerRow = headers.map((h) =>
          h ? h.toString().toLowerCase().trim() : "",
        );
        const nameIdx = headerRow.indexOf("guest name");
        const familyIdx = headerRow.indexOf("family name");

        // Parse data rows
        const dataRows = jsonData.slice(1);
        const processedRows = [];
        const errors = [];

        dataRows.forEach((row, index) => {
          if (row.every((cell) => !cell || cell.toString().trim() === ""))
            return;

          const rowData = {
            guestName: row[nameIdx] ? row[nameIdx].toString().trim() : "",
            familyName: row[familyIdx] ? row[familyIdx].toString().trim() : "",
          };

          if (!rowData.guestName)
            errors.push(`Row ${index + 2}: Missing guest name`);
          if (!rowData.familyName)
            errors.push(`Row ${index + 2}: Missing family name`);

          processedRows.push({
            ...rowData,
            rowNumber: index + 2,
            isValid: !!(rowData.guestName && rowData.familyName),
          });
        });

        setParsedData(processedRows);

        setPreviewData({
          headers: ["Guest Name", "Family Name", "Status"],
          rows: processedRows
            .slice(0, 10)
            .map((row) => [
              row.guestName,
              row.familyName,
              row.isValid ? "✓ Valid" : "❌ Invalid",
            ]),
          totalRows: processedRows.length,
          validRows: processedRows.filter((r) => r.isValid).length,
          errors,
        });

        if (errors.length > 0) {
          setError(
            `Validation errors found:\n${errors.slice(0, 5).join("\n")}${errors.length > 5 ? `\n... and ${errors.length - 5} more` : ""}`,
          );
        }
      } catch (parseError) {
        console.error("Excel parsing error:", parseError);
        setError("Error parsing Excel file. Please check the file format.");
      }
    };

    reader.readAsBinaryString(selectedFile);
  };

  const handleImport = async () => {
    if (!parsedData || parsedData.length === 0) {
      setError("No data to import");
      return;
    }

    const validRows = parsedData.filter((row) => row.isValid);
    if (validRows.length === 0) {
      setError("No valid rows to import");
      return;
    }

    setIsLoading(true);
    setError("");
    setImportResult(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/admin/import-families`,
        {
          passcode: clientConfig?.passcode,
          rows: validRows.map((row) => ({
            guestName: row.guestName,
            familyName: row.familyName,
          })),
        },
      );

      if (response.data.success) {
        setImportResult(response.data.summary);
        // Clear the form
        setFile(null);
        setParsedData(null);
        setPreviewData(null);
        // Reset file input
        document.getElementById("excel-file").value = "";
      } else {
        setError("Import failed: " + response.data.message);
      }
    } catch (importError) {
      console.error("Import error:", importError);
      if (importError.response?.status === 401) {
        setError("Authentication failed. Please logout and login again.");
      } else if (importError.response?.status === 429) {
        setError("Too many requests. Please try again later.");
      } else {
        setError(
          "Import failed: " +
            (importError.response?.data?.message || "Connection error"),
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setImportResult(null);
    setError("");
  };

  const isRsvpSection = ["rsvp", "create", "import"].includes(activeTab);

  return (
    <div className="admin-dashboard">
      {/* ── Header: title + logout only ── */}
      <div className="admin-header">
        <h1>Justin and Yara's Wedding</h1>
        <button
          onClick={onLogout}
          className="admin-btn admin-btn-secondary admin-logout-btn">
          Logout
        </button>
      </div>

      {/* ── Main tab bar ── */}
      <div className="admin-tabbar">
        <button
          onClick={() => setActiveTab("rsvp")}
          className={`admin-tab-btn ${isRsvpSection ? "active" : ""}`}>
          RSVPs
        </button>
        <button
          onClick={() => setActiveTab("financials")}
          className={`admin-tab-btn ${activeTab === "financials" ? "active" : ""}`}>
          Financials
        </button>
        <button
          onClick={() => setActiveTab("branding")}
          className={`admin-tab-btn ${activeTab === "branding" ? "active" : ""}`}>
          Branding
        </button>
        <button
          onClick={() => setActiveTab("tables")}
          className={`admin-tab-btn ${activeTab === "tables" ? "active" : ""}`}>
          Tables
        </button>
        <button
          onClick={() => setActiveTab("todos")}
          className={`admin-tab-btn ${activeTab === "todos" ? "active" : ""}`}>
          To-Dos
        </button>
        <button
          onClick={() => setActiveTab("vendors")}
          className={`admin-tab-btn ${activeTab === "vendors" ? "active" : ""}`}>
          Vendors
        </button>
      </div>

      {/* ── RSVP sub-navigation ── */}
      {isRsvpSection && (
        <div className="admin-subnav">
          <button
            onClick={() => setActiveTab("rsvp")}
            className={`admin-subnav-btn ${activeTab === "rsvp" ? "active" : ""}`}>
            View RSVPs
          </button>
          <button
            onClick={() => {
              setActiveTab("create");
              setCreateResult(null);
              setCreateError("");
            }}
            className={`admin-subnav-btn ${activeTab === "create" ? "active" : ""}`}>
            + Create Family
          </button>
          <button
            onClick={() => setActiveTab("import")}
            className={`admin-subnav-btn ${activeTab === "import" ? "active" : ""}`}>
            Import Guests
          </button>
        </div>
      )}

      {activeTab === "rsvp" && (
        <div className="admin-content">
          {/* Summary cards */}
          <div className="rsvp-summary">
            <div className="rsvp-stat-card rsvp-stat-total">
              <span className="rsvp-stat-number">{allRows.length}</span>
              <span className="rsvp-stat-label">Total Guests</span>
            </div>
            <div
              className="rsvp-stat-card rsvp-stat-yes"
              onClick={() => setFilter(filter === "yes" ? "all" : "yes")}
              style={{ cursor: "pointer" }}>
              <span className="rsvp-stat-number">{totalYes}</span>
              <span className="rsvp-stat-label">Attending ✓</span>
            </div>
            <div
              className="rsvp-stat-card rsvp-stat-no"
              onClick={() => setFilter(filter === "no" ? "all" : "no")}
              style={{ cursor: "pointer" }}>
              <span className="rsvp-stat-number">{totalNo}</span>
              <span className="rsvp-stat-label">Not Attending ✗</span>
            </div>
            <div
              className="rsvp-stat-card rsvp-stat-pending"
              onClick={() =>
                setFilter(filter === "pending" ? "all" : "pending")
              }
              style={{ cursor: "pointer" }}>
              <span className="rsvp-stat-number">{totalPending}</span>
              <span className="rsvp-stat-label">Pending</span>
            </div>
          </div>

          {/* Search + filter bar */}
          <div className="rsvp-toolbar">
            <input
              className="admin-input rsvp-search"
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="rsvp-filter-btns">
              {["all", "yes", "no", "pending"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`admin-btn rsvp-filter-btn ${filter === f ? "active" : ""}`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={fetchFamilies}
              className="admin-btn admin-btn-ghost"
              title="Refresh">
              ↺ Refresh
            </button>
            <button
              onClick={handleExportAttendingExcel}
              className="admin-btn admin-btn-ghost rsvp-export-btn"
              disabled={totalYes === 0}
              title="Export attending guests to Excel">
              ⬇ Export Attending
            </button>
          </div>

          {rsvpError && <div className="error-message">{rsvpError}</div>}

          {rsvpLoading ? (
            <div className="rsvp-loading">Loading guests…</div>
          ) : (
            <div className="admin-card rsvp-table-card">
              <div className="preview-table-container">
                <table className="preview-table rsvp-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Guest Name</th>
                      <th className="rsvp-th-center">Attending</th>
                      <th className="rsvp-th-center">Gift Registry</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="rsvp-empty">
                          No guests found.
                        </td>
                      </tr>
                    ) : (
                      (() => {
                        // Group filtered rows by familyId
                        const grouped = filteredRows.reduce((acc, row) => {
                          if (!acc[row.familyId]) acc[row.familyId] = [];
                          acc[row.familyId].push(row);
                          return acc;
                        }, {});

                        let guestCounter = 0;
                        return Object.entries(grouped).map(
                          ([familyId, rows]) => {
                            const fam = families.find(
                              (f) => f._id === familyId,
                            );
                            return (
                              <>
                                {/* Family header row */}
                                <tr
                                  key={`fam-${familyId}`}
                                  className="rsvp-family-header-row">
                                  <td
                                    colSpan={2}
                                    className="rsvp-family-header-cell">
                                    <div className="rsvp-family-header-inner">
                                      <span className="rsvp-family-label">
                                        Family
                                      </span>
                                      <span className="rsvp-family-id-chip">
                                        {rows[0]?.familyName || familyId}
                                      </span>
                                    </div>
                                  </td>
                                  <td />
                                  <td className="rsvp-td-center">
                                    <span
                                      className={`rsvp-badge ${
                                        fam?.giftRegistry === true
                                          ? "badge-gift-hidden"
                                          : "badge-gift-shown"
                                      }`}>
                                      {fam?.giftRegistry === true
                                        ? "Hidden"
                                        : "Shown"}
                                    </span>
                                  </td>
                                  <td className="rsvp-actions">
                                    <div className="rsvp-action-btns">
                                      <button
                                        className="admin-btn action-btn-invite"
                                        onClick={() =>
                                          openInviteModal(familyId)
                                        }>
                                        Invite
                                      </button>
                                      <button
                                        className="admin-btn action-btn-edit"
                                        onClick={() =>
                                          fam && openEditModal(fam)
                                        }>
                                        Edit
                                      </button>
                                      <button
                                        className="admin-btn action-btn-delete"
                                        onClick={() =>
                                          setDeletingFamilyId(familyId)
                                        }>
                                        Delete
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                                {/* Guest rows */}
                                {rows.map((row) => {
                                  guestCounter += 1;
                                  return (
                                    <tr
                                      key={`${familyId}-${row.name}`}
                                      className="rsvp-guest-row">
                                      <td className="rsvp-idx">
                                        {guestCounter}
                                      </td>
                                      <td className="rsvp-name rsvp-guest-name">
                                        {row.name}
                                      </td>
                                      <td className="rsvp-td-center">
                                        <span
                                          className={`rsvp-badge ${
                                            row.attending === true
                                              ? "badge-yes"
                                              : row.attending === false
                                                ? "badge-no"
                                                : "badge-pending"
                                          }`}>
                                          {row.attending === true
                                            ? "✓ Yes"
                                            : row.attending === false
                                              ? "✗ No"
                                              : "— Pending"}
                                        </span>
                                      </td>
                                      <td />
                                      <td />
                                    </tr>
                                  );
                                })}
                              </>
                            );
                          },
                        );
                      })()
                    )}
                  </tbody>
                </table>
              </div>
              <p className="preview-note">
                Showing {filteredRows.length} of {allRows.length} guests across{" "}
                {families.length} famil{families.length === 1 ? "y" : "ies"}.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Create Family tab ────────────────────────────────────────── */}
      {activeTab === "create" && (
        <div className="admin-content">
          <div className="admin-card">
            <h2>Create a New Family</h2>
            <p>
              Add a family group manually. Each family gets a unique shareable
              RSVP link you can send to guests.
            </p>

            <div className="create-family-guests">
              <h3>Guests</h3>
              {createGuests.map((guest, i) => (
                <div key={i} className="create-guest-row">
                  <input
                    className="admin-input create-guest-input"
                    placeholder={`Guest ${i + 1} full name`}
                    value={guest.name}
                    onChange={(e) => handleCreateGuestName(i, e.target.value)}
                  />
                  <button
                    className="admin-btn action-btn-delete create-remove-btn"
                    onClick={() => handleRemoveCreateGuest(i)}
                    disabled={createGuests.length === 1}
                    title="Remove guest">
                    ✕
                  </button>
                </div>
              ))}
              <button
                className="admin-btn admin-btn-ghost add-guest-btn"
                onClick={handleAddCreateGuest}>
                + Add Another Guest
              </button>
            </div>

            <div className="create-gift-toggle">
              <label className="create-toggle-label">
                <input
                  type="checkbox"
                  checked={createGiftRegistry}
                  onChange={(e) => setCreateGiftRegistry(e.target.checked)}
                  className="create-toggle-checkbox"
                />
                Hide Gift registry for this family
              </label>
            </div>

            {createError && <div className="error-message">{createError}</div>}

            <div className="import-actions">
              <button
                className="admin-btn admin-btn-primary"
                onClick={handleCreateFamily}
                disabled={createLoading}>
                {createLoading ? "Creating…" : "Create Family"}
              </button>
            </div>

            {createResult && (
              <div className="create-result success-message">
                <h3>Family Created!</h3>
                <p>
                  <strong>Family ID:</strong>{" "}
                  <code className="family-id-code">
                    {createResult.family._id}
                  </code>
                </p>
                <p>
                  <strong>Guests:</strong>{" "}
                  {(createResult.family.attendees || [])
                    .map((a) => a.name)
                    .join(", ")}
                </p>
                <div className="rsvp-link-box">
                  <p className="rsvp-link-label">Shareable RSVP Link:</p>
                  <div className="rsvp-link-row">
                    <input
                      readOnly
                      className="admin-input rsvp-link-input"
                      value={createResult.rsvpUrl}
                      onFocus={(e) => e.target.select()}
                    />
                    <button
                      className="admin-btn admin-btn-primary"
                      onClick={() => {
                        navigator.clipboard.writeText(createResult.rsvpUrl);
                      }}>
                      Copy Link
                    </button>
                  </div>
                  <button
                    className="admin-btn invite-btn"
                    onClick={() => openInviteModal(createResult.family._id)}>
                    Share Invite Message
                  </button>
                </div>
                <button
                  className="admin-btn admin-btn-ghost"
                  onClick={() => setCreateResult(null)}
                  style={{ marginTop: "1rem" }}>
                  Create Another Family
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Import tab ──────────────────────────────────────────────────── */}
      {activeTab === "import" && (
        <div className="admin-content">
          <div className="admin-card">
            <h2>Bulk Import Guests</h2>
            <p>Upload an Excel file (.xlsx) with the following columns:</p>
            <ul className="requirements-list">
              <li>
                <strong>guest name</strong> - Full name of the guest
              </li>
              <li>
                <strong>attended</strong> - TRUE/FALSE, Yes/No, or 1/0
              </li>
              <li>
                <strong>familyId</strong> - Unique identifier to group guests
                into families
              </li>
            </ul>

            <div className="file-upload-section">
              <input
                id="excel-file"
                type="file"
                accept=".xlsx"
                onChange={handleFileUpload}
                className="admin-file-input"
                disabled={isLoading}
              />
              <label htmlFor="excel-file" className="admin-file-label">
                {file ? file.name : "Choose Excel File (.xlsx)"}
              </label>
            </div>

            {error && (
              <div className="error-message">
                <pre>{error}</pre>
              </div>
            )}

            {previewData && (
              <div className="preview-section">
                <h3>Preview Data</h3>
                <div className="preview-stats">
                  <span className="stat">
                    Total Rows: {previewData.totalRows}
                  </span>
                  <span className="stat">
                    Valid Rows: {previewData.validRows}
                  </span>
                  <span className="stat">
                    Invalid Rows:{" "}
                    {previewData.totalRows - previewData.validRows}
                  </span>
                </div>

                <div className="preview-table-container">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        {previewData.headers.map((header, index) => (
                          <th key={index}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.rows.map((row, index) => (
                        <tr
                          key={index}
                          className={
                            row[3].includes("Invalid") ? "invalid-row" : ""
                          }>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {previewData.totalRows > 10 && (
                  <p className="preview-note">
                    Showing first 10 rows of {previewData.totalRows} total rows
                  </p>
                )}
              </div>
            )}

            {parsedData && (
              <div className="import-actions">
                <button
                  onClick={handleImport}
                  disabled={isLoading || !parsedData.some((r) => r.isValid)}
                  className="admin-btn admin-btn-primary">
                  {isLoading
                    ? "Importing..."
                    : `Import ${parsedData.filter((r) => r.isValid).length} Valid Rows`}
                </button>
              </div>
            )}

            {importResult && (
              <div className="import-result">
                <div className="success-message">
                  <h3>Import Completed Successfully!</h3>
                  <div className="result-stats">
                    <div className="result-stat">
                      <strong>Families Created:</strong>{" "}
                      {importResult.insertedFamilies}
                    </div>
                    <div className="result-stat">
                      <strong>Guests Imported:</strong>{" "}
                      {importResult.insertedGuests}
                    </div>
                    <div className="result-stat">
                      <strong>Rows Skipped:</strong> {importResult.skippedRows}
                    </div>
                    <div className="result-stat">
                      <strong>Family Groups Processed:</strong>{" "}
                      {importResult.processedFamilyGroups}
                    </div>
                  </div>

                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="import-errors">
                      <h4>Errors:</h4>
                      <ul>
                        {importResult.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={clearResults}
                    className="admin-btn admin-btn-secondary">
                    Import More Files
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Financials Tab ───────────────────────────────────────────────── */}
      {activeTab === "financials" && (
        <>
          {/* Financials sub-nav */}
          <div className="admin-subnav">
            {Object.entries(FIN_SECTIONS).map(([key, { label }]) => (
              <button
                key={key}
                className={`admin-subnav-btn ${finSubTab === key ? "active" : ""}`}
                onClick={() => {
                  setFinSubTab(key);
                  setExpError("");
                }}>
                {label}
              </button>
            ))}
          </div>

          <div className="admin-content">
            {/* ── Overview bar ── */}
            <div className="fin-overview">
              <div className="fin-overview-card">
                <span className="fin-overview-label">Cyprus Total</span>
                <span className="fin-overview-val">{fmt(totalCyprus)}</span>
              </div>
              <div className="fin-overview-card">
                <span className="fin-overview-label">Lebanon Total</span>
                <span className="fin-overview-val">{fmt(totalLebanon)}</span>
              </div>
              <div className="fin-overview-card fin-overview-grand">
                <span className="fin-overview-label">Grand Total</span>
                <span className="fin-overview-val">
                  {fmt(totalCyprus + totalLebanon)}
                </span>
              </div>
              <div className="fin-overview-card fin-overview-gifts">
                <span className="fin-overview-label">Gifts Received</span>
                <span className="fin-overview-val">
                  {gifts.length} ({fmt(totalGifts)})
                </span>
              </div>
              <div className="fin-overview-card fin-overview-currency">
                <span className="fin-overview-label">Currency</span>
                <select
                  className="fin-currency-select"
                  value={finCurrency}
                  onChange={(e) => setFinCurrency(e.target.value)}>
                  <option value="USD">$ USD</option>
                  <option value="EUR">€ EUR</option>
                </select>
              </div>
              <div className="fin-overview-card fin-overview-export">
                <button
                  className="admin-btn admin-btn-primary fin-export-all-btn"
                  onClick={handleExportFinancialsExcel}
                  disabled={
                    expenses.length === 0 &&
                    expLebanon.length === 0 &&
                    gifts.length === 0
                  }
                  title="Export all financials to Excel">
                  ⬇ Export All to Excel
                </button>
              </div>
            </div>

            {/* ── Expenses sub-tabs (Cyprus / Lebanon) ── */}
            {(finSubTab === "cyprus" || finSubTab === "lebanon") && (
              <>
                <div className="fin-summary">
                  <div className="fin-stat-card fin-stat-total">
                    <span className="fin-stat-amount">
                      {fmt(totalExpenses)}
                    </span>
                    <span className="fin-stat-label">Total</span>
                  </div>
                  <div className="fin-stat-card fin-stat-paid">
                    <span className="fin-stat-amount">{fmt(totalPaid)}</span>
                    <span className="fin-stat-label">Paid</span>
                  </div>
                  <div className="fin-stat-card fin-stat-unpaid">
                    <span className="fin-stat-amount">{fmt(totalUnpaid)}</span>
                    <span className="fin-stat-label">Remaining</span>
                  </div>
                </div>

                <div className="fin-toolbar">
                  <h2 className="fin-section-title">
                    {FIN_SECTIONS[finSubTab].label} — Expenses
                  </h2>
                  <div className="fin-toolbar-actions">
                    <button
                      className="admin-btn admin-btn-ghost"
                      onClick={() => fetchSection(finSubTab)}
                      disabled={finLoading}>
                      ↺ Refresh
                    </button>
                    <button
                      className="admin-btn admin-btn-primary"
                      onClick={() =>
                        setExpForm({ ...EMPTY_EXPENSE, currency: finCurrency })
                      }>
                      + Add Expense
                    </button>
                  </div>
                </div>

                {expError && <div className="error-message">{expError}</div>}

                {finLoading ? (
                  <div className="rsvp-loading">Loading…</div>
                ) : (
                  <div className="admin-card rsvp-table-card">
                    <div className="preview-table-container">
                      <table className="preview-table fin-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>Category</th>
                            <th>Vendor</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Due Date</th>
                            <th>Notes</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeExpenses.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="rsvp-empty">
                                No expenses yet. Click "+ Add Expense" to get
                                started.
                              </td>
                            </tr>
                          ) : (
                            activeExpenses.map((exp, i) => {
                              const linkedVendor = exp.vendorId
                                ? vendors.find((v) => v.id === exp.vendorId)
                                : null;
                              return (
                                <tr
                                  key={exp.id}
                                  className={`fin-row fin-row-${exp.status}`}>
                                  <td className="rsvp-idx">{i + 1}</td>
                                  <td className="fin-name">{exp.name}</td>
                                  <td className="fin-category">
                                    {exp.category || "—"}
                                  </td>
                                  <td className="fin-category">
                                    {linkedVendor ? (
                                      <span className="vendor-chip">
                                        {linkedVendor.name}
                                      </span>
                                    ) : (
                                      <span className="fin-muted">—</span>
                                    )}
                                  </td>
                                  <td className="fin-amount">{fmtExp(exp)}</td>
                                  <td>
                                    <span
                                      className={`rsvp-badge ${exp.status === "paid" ? "badge-yes" : "badge-no"}`}>
                                      {exp.status === "paid"
                                        ? "✓ Paid"
                                        : "✗ Unpaid"}
                                    </span>
                                  </td>
                                  <td className="fin-date">
                                    {exp.dueDate
                                      ? new Date(
                                          exp.dueDate,
                                        ).toLocaleDateString("en-GB", {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                        })
                                      : "—"}
                                  </td>
                                  <td className="fin-notes">
                                    {exp.notes || "—"}
                                  </td>
                                  <td className="rsvp-actions">
                                    <div className="rsvp-action-btns">
                                      <button
                                        className="admin-btn action-btn-edit"
                                        onClick={() =>
                                          setExpForm({
                                            id: exp.id,
                                            name: exp.name,
                                            amount: exp.amount,
                                            currency:
                                              exp.currency || finCurrency,
                                            status: exp.status,
                                            notes: exp.notes || "",
                                            category: exp.category || "",
                                            dueDate: exp.dueDate || "",
                                            paidDate: exp.paidDate || "",
                                            vendorId: exp.vendorId || "",
                                          })
                                        }>
                                        Edit
                                      </button>
                                      <button
                                        className="admin-btn action-btn-delete"
                                        onClick={() =>
                                          setDeletingExpId(exp.id)
                                        }>
                                        Delete
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                    {activeExpenses.length > 0 && (
                      <p className="preview-note">
                        {activeExpenses.length} expense
                        {activeExpenses.length !== 1 ? "s" : ""} ·{" "}
                        {
                          activeExpenses.filter((e) => e.status === "paid")
                            .length
                        }{" "}
                        paid ·{" "}
                        {
                          activeExpenses.filter((e) => e.status === "unpaid")
                            .length
                        }{" "}
                        unpaid
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── Gifts sub-tab ── */}
            {finSubTab === "gifts" && (
              <>
                <div className="fin-summary">
                  <div className="fin-stat-card fin-stat-total">
                    <span className="fin-stat-amount">{gifts.length}</span>
                    <span className="fin-stat-label">Total Gifts</span>
                  </div>
                  <div className="fin-stat-card fin-stat-paid">
                    <span className="fin-stat-amount">{fmt(totalGifts)}</span>
                    <span className="fin-stat-label">Total Value</span>
                  </div>
                  <div className="fin-stat-card fin-stat-unpaid">
                    <span className="fin-stat-amount">
                      {gifts.filter((g) => !g.thankYouSent).length}
                    </span>
                    <span className="fin-stat-label">Thank Yous Pending</span>
                  </div>
                </div>

                <div className="fin-toolbar">
                  <h2 className="fin-section-title">Gifts Received</h2>
                  <div className="fin-toolbar-actions">
                    <button
                      className="admin-btn admin-btn-ghost"
                      onClick={() => fetchSection("gifts")}
                      disabled={finLoading}>
                      ↺ Refresh
                    </button>
                    <button
                      className="admin-btn admin-btn-primary"
                      onClick={() => setGiftForm({ ...EMPTY_GIFT })}>
                      + Add Gift
                    </button>
                  </div>
                </div>

                <div className="admin-card rsvp-table-card">
                  <div className="preview-table-container">
                    <table className="preview-table fin-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>From</th>
                          <th>Description</th>
                          <th>Amount</th>
                          <th>Received</th>
                          <th>Thank You</th>
                          <th>Notes</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gifts.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="rsvp-empty">
                              No gifts yet. Click "+ Add Gift" to get started.
                            </td>
                          </tr>
                        ) : (
                          gifts.map((g, i) => (
                            <tr key={g.id} className="fin-row">
                              <td className="rsvp-idx">{i + 1}</td>
                              <td className="fin-name">{g.from}</td>
                              <td className="fin-category">
                                {g.description || "—"}
                              </td>
                              <td className="fin-amount">
                                {g.amount ? fmt(g.amount) : "—"}
                              </td>
                              <td>
                                <span
                                  className={`rsvp-badge ${g.received ? "badge-yes" : "badge-pending"}`}>
                                  {g.received ? "✓ Yes" : "— No"}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`rsvp-badge ${g.thankYouSent ? "badge-yes" : "badge-no"}`}>
                                  {g.thankYouSent ? "✓ Sent" : "✗ Pending"}
                                </span>
                              </td>
                              <td className="fin-notes">{g.notes || "—"}</td>
                              <td className="rsvp-actions">
                                <div className="rsvp-action-btns">
                                  <button
                                    className="admin-btn action-btn-edit"
                                    onClick={() =>
                                      setGiftForm({
                                        ...g,
                                        amount: g.amount ?? "",
                                      })
                                    }>
                                    Edit
                                  </button>
                                  <button
                                    className="admin-btn action-btn-delete"
                                    onClick={() => setDeletingGiftId(g.id)}>
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {gifts.length > 0 && (
                    <p className="preview-note">
                      {gifts.length} gift{gifts.length !== 1 ? "s" : ""} ·{" "}
                      {gifts.filter((g) => g.thankYouSent).length} thank yous
                      sent · {gifts.filter((g) => !g.thankYouSent).length}{" "}
                      pending
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ── Expense Form Modal ───────────────────────────────────────────── */}
      {expForm !== null && (
        <div className="modal-overlay" onClick={() => setExpForm(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{expForm.id ? "Edit Expense" : "Add Expense"}</h2>
              <button
                className="modal-close-btn"
                onClick={() => setExpForm(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="exp-form-grid">
                <div className="exp-form-field exp-form-full">
                  <label className="exp-label">Name / Description *</label>
                  <input
                    className="admin-input"
                    placeholder="e.g. Catering deposit"
                    value={expForm.name}
                    onChange={(e) =>
                      setExpForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                <div className="exp-form-field">
                  <label className="exp-label">Amount *</label>
                  <div className="exp-amount-row">
                    <select
                      className="admin-input exp-currency-select"
                      value={expForm.currency || "USD"}
                      onChange={(e) =>
                        setExpForm((f) => ({ ...f, currency: e.target.value }))
                      }>
                      <option value="USD">$ USD</option>
                      <option value="EUR">€ EUR</option>
                      <option value="GBP">£ GBP</option>
                      <option value="LBP">LBP</option>
                      <option value="AED">AED</option>
                    </select>
                    <input
                      className="admin-input exp-amount-input"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={expForm.amount}
                      onChange={(e) =>
                        setExpForm((f) => ({ ...f, amount: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="exp-form-field">
                  <label className="exp-label">Status</label>
                  <select
                    className="admin-input"
                    value={expForm.status}
                    onChange={(e) =>
                      setExpForm((f) => ({ ...f, status: e.target.value }))
                    }>
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div className="exp-form-field">
                  <label className="exp-label">Category</label>
                  <select
                    className="admin-input"
                    value={expForm.category}
                    onChange={(e) =>
                      setExpForm((f) => ({ ...f, category: e.target.value }))
                    }>
                    <option value="">— Select —</option>
                    <option value="Venue">Venue</option>
                    <option value="Catering">Catering</option>
                    <option value="Flowers">Flowers</option>
                    <option value="DJ / Music">DJ / Music</option>
                    <option value="Makeup">Makeup</option>
                    <option value="Photography">Photography</option>
                    <option value="Videography">Videography</option>
                    <option value="Cake">Cake</option>
                    <option value="Dress / Attire">Dress / Attire</option>
                    <option value="Invitations">Invitations</option>
                    <option value="Transport">Transport</option>
                    <option value="Accommodation">Accommodation</option>
                    <option value="Decoration">Decoration</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="exp-form-field">
                  <label className="exp-label">Vendor (optional)</label>
                  <select
                    className="admin-input"
                    value={expForm.vendorId || ""}
                    onChange={(e) =>
                      setExpForm((f) => ({ ...f, vendorId: e.target.value }))
                    }>
                    <option value="">— No vendor —</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                        {v.type ? ` (${v.type})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="exp-form-field">
                  <label className="exp-label">Due Date</label>
                  <input
                    className="admin-input"
                    type="date"
                    value={expForm.dueDate}
                    onChange={(e) =>
                      setExpForm((f) => ({ ...f, dueDate: e.target.value }))
                    }
                  />
                </div>
                <div className="exp-form-field">
                  <label className="exp-label">Payment Date</label>
                  <input
                    className="admin-input"
                    type="date"
                    value={expForm.paidDate}
                    onChange={(e) =>
                      setExpForm((f) => ({ ...f, paidDate: e.target.value }))
                    }
                  />
                </div>
                <div className="exp-form-field exp-form-full">
                  <label className="exp-label">Notes</label>
                  <textarea
                    className="admin-input exp-notes-input"
                    rows={3}
                    placeholder="Any additional details…"
                    value={expForm.notes}
                    onChange={(e) =>
                      setExpForm((f) => ({ ...f, notes: e.target.value }))
                    }
                  />
                </div>
              </div>
              {(!expForm.name?.trim() || expForm.amount === "") && (
                <p className="exp-required-hint">
                  * Name and amount are required
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="admin-btn admin-btn-ghost"
                onClick={() => setExpForm(null)}>
                Cancel
              </button>
              <button
                className="admin-btn admin-btn-primary"
                onClick={handleExpSave}
                disabled={!expForm?.name?.trim() || expForm?.amount === ""}>
                {expForm?.id ? "Save Changes" : "Add Expense"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Expense Confirmation ──────────────────────────────────── */}
      {deletingExpId && (
        <div className="modal-overlay" onClick={() => setDeletingExpId(null)}>
          <div
            className="modal-box modal-box-sm"
            onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Expense</h2>
              <button
                className="modal-close-btn"
                onClick={() => setDeletingExpId(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete this expense?{" "}
                <strong>This cannot be undone.</strong>
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="admin-btn admin-btn-ghost"
                onClick={() => setDeletingExpId(null)}>
                Cancel
              </button>
              <button
                className="admin-btn action-btn-delete"
                onClick={handleExpDelete}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Gift Form Modal ──────────────────────────────────────────────── */}
      {giftForm !== null && (
        <div className="modal-overlay" onClick={() => setGiftForm(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{giftForm.id ? "Edit Gift" : "Add Gift"}</h2>
              <button
                className="modal-close-btn"
                onClick={() => setGiftForm(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="exp-form-grid">
                <div className="exp-form-field exp-form-full">
                  <label className="exp-label">From (Guest) *</label>
                  <select
                    className="admin-input"
                    value={giftForm.from}
                    onChange={(e) =>
                      setGiftForm((f) => ({ ...f, from: e.target.value }))
                    }>
                    <option value="">— Select guest —</option>
                    {[...new Set(allRows.map((r) => r.name))]
                      .sort()
                      .map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    <option value="__other__">Other (type below)</option>
                  </select>
                  {giftForm.from === "__other__" && (
                    <input
                      className="admin-input"
                      style={{ marginTop: "6px" }}
                      placeholder="Type name…"
                      value={giftForm.fromCustom || ""}
                      onChange={(e) =>
                        setGiftForm((f) => ({
                          ...f,
                          fromCustom: e.target.value,
                        }))
                      }
                    />
                  )}
                </div>
                <div className="exp-form-field exp-form-full">
                  <label className="exp-label">Description</label>
                  <input
                    className="admin-input"
                    placeholder="e.g. Cash, Crystal vase…"
                    value={giftForm.description}
                    onChange={(e) =>
                      setGiftForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="exp-form-field">
                  <label className="exp-label">Amount (optional)</label>
                  <input
                    className="admin-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={giftForm.amount}
                    onChange={(e) =>
                      setGiftForm((f) => ({ ...f, amount: e.target.value }))
                    }
                  />
                </div>
                <div className="exp-form-field">
                  <label className="exp-label">Received?</label>
                  <select
                    className="admin-input"
                    value={giftForm.received ? "yes" : "no"}
                    onChange={(e) =>
                      setGiftForm((f) => ({
                        ...f,
                        received: e.target.value === "yes",
                      }))
                    }>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div className="exp-form-field">
                  <label className="exp-label">Thank You Sent?</label>
                  <select
                    className="admin-input"
                    value={giftForm.thankYouSent ? "yes" : "no"}
                    onChange={(e) =>
                      setGiftForm((f) => ({
                        ...f,
                        thankYouSent: e.target.value === "yes",
                      }))
                    }>
                    <option value="no">No — Pending</option>
                    <option value="yes">Yes — Sent</option>
                  </select>
                </div>
                <div className="exp-form-field exp-form-full">
                  <label className="exp-label">Notes</label>
                  <textarea
                    className="admin-input exp-notes-input"
                    rows={2}
                    placeholder="Any extra details…"
                    value={giftForm.notes}
                    onChange={(e) =>
                      setGiftForm((f) => ({ ...f, notes: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="admin-btn admin-btn-ghost"
                onClick={() => setGiftForm(null)}>
                Cancel
              </button>
              <button
                className="admin-btn admin-btn-primary"
                onClick={handleGiftSave}
                disabled={
                  !giftForm?.from || giftForm.from === "__other__"
                    ? !giftForm?.fromCustom?.trim()
                    : false
                }>
                {giftForm?.id ? "Save Changes" : "Add Gift"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Gift Confirmation ─────────────────────────────────────── */}
      {deletingGiftId && (
        <div className="modal-overlay" onClick={() => setDeletingGiftId(null)}>
          <div
            className="modal-box modal-box-sm"
            onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Gift</h2>
              <button
                className="modal-close-btn"
                onClick={() => setDeletingGiftId(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete this gift record?{" "}
                <strong>This cannot be undone.</strong>
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="admin-btn admin-btn-ghost"
                onClick={() => setDeletingGiftId(null)}>
                Cancel
              </button>
              <button
                className="admin-btn action-btn-delete"
                onClick={handleGiftDelete}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {editingFamily && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Family</h2>
              <button className="modal-close-btn" onClick={closeEditModal}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-family-id">
                Family ID: <code>{editingFamily._id}</code>
              </p>

              <h4 className="modal-section-title">Guests</h4>
              {editAttendees.map((att, i) => (
                <div key={i} className="modal-attendee-row">
                  <input
                    className="admin-input modal-name-input"
                    placeholder="Guest name"
                    value={att.name}
                    onChange={(e) => handleEditAttendeeName(i, e.target.value)}
                  />
                  <select
                    className="admin-input modal-attending-select"
                    value={
                      att.attending === true
                        ? "true"
                        : att.attending === false
                          ? "false"
                          : "null"
                    }
                    onChange={(e) =>
                      handleEditAttendeeAttending(
                        i,
                        e.target.value === "true"
                          ? true
                          : e.target.value === "false"
                            ? false
                            : null,
                      )
                    }>
                    <option value="null">— Pending</option>
                    <option value="true">Attending</option>
                    <option value="false">Not Attending</option>
                  </select>
                  <button
                    className="admin-btn action-btn-delete modal-remove-btn"
                    onClick={() => handleRemoveAttendeeFromEdit(i)}
                    disabled={editAttendees.length === 1}
                    title="Remove guest">
                    ✕
                  </button>
                </div>
              ))}
              <button
                className="admin-btn admin-btn-ghost add-guest-btn"
                onClick={handleAddAttendeeToEdit}>
                + Add Guest
              </button>

              <div className="modal-gift-toggle">
                <label className="create-toggle-label">
                  <input
                    type="checkbox"
                    checked={editingFamily.giftRegistry ?? true}
                    onChange={(e) =>
                      setEditingFamily((prev) => ({
                        ...prev,
                        giftRegistry: e.target.checked,
                      }))
                    }
                    className="create-toggle-checkbox"
                  />
                  Hide gift registry section for this family
                </label>
              </div>

              {editError && (
                <div className="error-message" style={{ marginTop: "1rem" }}>
                  {editError}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="admin-btn admin-btn-ghost"
                onClick={closeEditModal}>
                Cancel
              </button>
              <button
                className="admin-btn admin-btn-primary"
                onClick={handleSaveEdit}
                disabled={editSaving}>
                {editSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ────────────────────────────────────── */}
      {deletingFamilyId && (
        <div
          className="modal-overlay"
          onClick={() => setDeletingFamilyId(null)}>
          <div
            className="modal-box modal-box-sm"
            onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Family</h2>
              <button
                className="modal-close-btn"
                onClick={() => setDeletingFamilyId(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete this family and all their guest
                records? <strong>This cannot be undone.</strong>
              </p>
              <p className="modal-family-id">
                Family ID: <code>{deletingFamilyId}</code>
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="admin-btn admin-btn-ghost"
                onClick={() => setDeletingFamilyId(null)}>
                Cancel
              </button>
              <button
                className="admin-btn action-btn-delete"
                onClick={handleDeleteFamily}
                disabled={deleteLoading}>
                {deleteLoading ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Invite Modal ─────────────────────────────────────────────────── */}
      {invitingFamilyId && (
        <div className="modal-overlay" onClick={closeInviteModal}>
          <div
            className="modal-box invite-modal-box"
            onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Send Invite</h2>
              <button className="modal-close-btn" onClick={closeInviteModal}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-family-id">
                Family ID: <code>{invitingFamilyId}</code>
              </p>

              {/* Message section */}
              <div className="invite-section-header">
                <span className="invite-section-label">Message</span>
                <button
                  className="admin-btn invite-edit-toggle"
                  onClick={() => setInviteEditing((v) => !v)}>
                  {inviteEditing ? "Done" : "Edit"}
                </button>
              </div>
              <div className="invite-preview">
                {inviteEditing ? (
                  <textarea
                    className="invite-message-textarea"
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    rows={9}
                  />
                ) : (
                  <pre className="invite-message-preview">{inviteMessage}</pre>
                )}
              </div>

              {/* Photo section */}
              <div
                className="invite-section-header"
                style={{ marginTop: "1rem" }}>
                <span className="invite-section-label">Photo (optional)</span>
                {invitePhoto && (
                  <button
                    className="admin-btn invite-edit-toggle"
                    onClick={() => setInvitePhoto(null)}>
                    Remove
                  </button>
                )}
              </div>
              {invitePhoto ? (
                <div className="invite-photo-preview">
                  <img
                    src={URL.createObjectURL(invitePhoto)}
                    alt="invite"
                    className="invite-photo-img"
                  />
                </div>
              ) : (
                <label className="invite-photo-upload-label">
                  <input
                    type="file"
                    accept="image/*"
                    className="invite-photo-input"
                    onChange={(e) => setInvitePhoto(e.target.files[0] || null)}
                  />
                  + Upload Photo
                </label>
              )}
            </div>
            <div className="modal-footer invite-modal-footer">
              <button
                className="admin-btn invite-copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(inviteMessage);
                  setInviteCopied(true);
                  setTimeout(() => setInviteCopied(false), 2000);
                }}>
                {inviteCopied ? "✓ Copied!" : "Copy Message"}
              </button>
              <button
                className="admin-btn invite-whatsapp-btn"
                onClick={handleShareWhatsApp}>
                <span className="whatsapp-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    width="18"
                    height="18">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </span>
                Share on WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TABLES TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "tables" && (
        <div className="admin-content">
          <div className="fin-toolbar">
            <h2 className="fin-section-title">Guest Tables</h2>
            <div className="fin-toolbar-actions">
              <div className="view-toggle-group">
                <button
                  className={`view-toggle-btn ${!floorPlanMode ? "active" : ""}`}
                  onClick={() => setFloorPlanMode(false)}>
                  List
                </button>
                <button
                  className={`view-toggle-btn ${floorPlanMode ? "active" : ""}`}
                  onClick={() => setFloorPlanMode(true)}>
                  Floor Plan
                </button>
              </div>
              <button
                className="admin-btn admin-btn-ghost"
                onClick={() => fetchSimple("tables", setTables)}>
                ↺ Refresh
              </button>
              <button
                className="admin-btn admin-btn-ghost"
                onClick={handleExportTablesExcel}
                title="Export tables and guest seating to Excel">
                ⬇ Export Excel
              </button>
              {floorPlanMode && (
                <button
                  className="admin-btn admin-btn-ghost"
                  onClick={handleExportFloorPlanPDF}>
                  ⬇ Export PDF
                </button>
              )}
              <button
                className="admin-btn admin-btn-primary"
                onClick={() => setTableForm({ ...EMPTY_TABLE })}>
                + Add Table
              </button>
            </div>
          </div>

          {/* ── LIST VIEW ── */}
          {!floorPlanMode && (
            <div className="tables-grid">
              {tables.length === 0 && (
                <div
                  className="rsvp-empty"
                  style={{ padding: "2rem", textAlign: "center" }}>
                  No tables yet. Click "+ Add Table" to start.
                </div>
              )}
              {[...tables]
                .sort((a, b) => (a.priority || 3) - (b.priority || 3))
                .map((tbl) => (
                  <div key={tbl.id} className="table-card">
                    <div className="table-card-header">
                      <span className="table-card-name">{tbl.name}</span>
                      <div className="table-card-meta">
                        {tbl.priority && (
                          <span
                            className="table-priority-badge"
                            style={{
                              background: PRIORITY_COLORS[tbl.priority] + "22",
                              color: PRIORITY_COLORS[tbl.priority],
                              borderColor: PRIORITY_COLORS[tbl.priority] + "66",
                            }}>
                            {PRIORITY_LABELS[tbl.priority]}
                          </span>
                        )}
                        {tbl.shape && (
                          <span
                            className={`table-shape-badge shape-badge-${tbl.shape}`}>
                            <span
                              className={`table-shape-icon shape-${tbl.shape} shape-icon-sm`}
                            />
                            {tbl.shape.charAt(0).toUpperCase() +
                              tbl.shape.slice(1)}
                          </span>
                        )}
                        <span className="table-card-seats">
                          {(tbl.guests || []).length}
                          {tbl.seats ? `/${tbl.seats}` : ""} seats
                        </span>
                      </div>
                    </div>
                    {tbl.guests && tbl.guests.length > 0 && (
                      <ul className="table-guest-list">
                        {tbl.guests.map((g, i) => (
                          <li key={i}>{g}</li>
                        ))}
                      </ul>
                    )}
                    {tbl.notes && <p className="table-notes">{tbl.notes}</p>}
                    <div className="table-card-actions">
                      <button
                        className="admin-btn action-btn-edit"
                        onClick={() =>
                          setTableForm({
                            ...tbl,
                            guests: [...(tbl.guests || [])],
                          })
                        }>
                        Edit
                      </button>
                      <button
                        className="admin-btn action-btn-delete"
                        onClick={() => setDeletingTableId(tbl.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* ── FLOOR PLAN VIEW ── */}
          {floorPlanMode && (
            <div
              className={`floor-plan-canvas${draggingId ? " fp-is-dragging" : ""}`}
              ref={floorPlanRef}
              onMouseMove={onFloorMove}
              onMouseUp={endDrag}
              onMouseLeave={endDrag}>
              {tables.length === 0 && (
                <div className="fp-empty">
                  Add tables first, then arrange them here.
                </div>
              )}
              {tables.map((tbl, i) => {
                const pos = tbl.position || {
                  x: 20 + (i % 5) * 190,
                  y: 20 + Math.floor(i / 5) * 160,
                };
                const pColor = PRIORITY_COLORS[tbl.priority || 3];
                return (
                  <div
                    key={tbl.id}
                    className={`fp-table fp-shape-${tbl.shape || "round"} ${draggingId === tbl.id ? "fp-dragging" : ""}`}
                    style={{
                      left: pos.x,
                      top: pos.y,
                      borderColor: pColor,
                      "--fp-color": pColor,
                    }}
                    onMouseDown={(e) => startDrag(e, tbl)}>
                    <span
                      className="fp-priority"
                      style={{ background: pColor }}>
                      {tbl.priority || 3}
                    </span>
                    <span className="fp-table-name">{tbl.name}</span>
                    <span className="fp-table-count">
                      {(tbl.guests || []).length}
                      {tbl.seats ? `/${tbl.seats}` : ""}
                    </span>
                    {(tbl.guests || []).slice(0, 4).map((g, gi) => (
                      <span key={gi} className="fp-guest-dot" title={g}>
                        {g.split(" ")[0]}
                      </span>
                    ))}
                    {(tbl.guests || []).length > 4 && (
                      <span className="fp-guest-dot fp-more">
                        +{tbl.guests.length - 4}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Table form modal */}
      {tableForm && (
        <div className="modal-overlay" onClick={() => setTableForm(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{tableForm.id ? "Edit Table" : "Add Table"}</h2>
              <button
                className="modal-close-btn"
                onClick={() => setTableForm(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="exp-form-grid">
                <div className="exp-form-field exp-form-full">
                  <label className="exp-label">Table Name / Number *</label>
                  <input
                    className="admin-input"
                    placeholder="e.g. Table 1, VIP Table…"
                    value={tableForm.name}
                    onChange={(e) =>
                      setTableForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                <div className="exp-form-field">
                  <label className="exp-label">Max Seats</label>
                  <input
                    className="admin-input"
                    type="number"
                    min="1"
                    placeholder="10"
                    value={tableForm.seats}
                    onChange={(e) =>
                      setTableForm((f) => ({ ...f, seats: e.target.value }))
                    }
                  />
                </div>
                <div className="exp-form-field">
                  <label className="exp-label">Table Shape</label>
                  <div className="table-shape-picker">
                    {[
                      { value: "round", label: "Round" },
                      { value: "rectangle", label: "Rectangle" },
                      { value: "square", label: "Square" },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        className={`table-shape-btn ${tableForm.shape === value ? "active" : ""}`}
                        onClick={() =>
                          setTableForm((f) => ({ ...f, shape: value }))
                        }>
                        <span className={`table-shape-icon shape-${value}`} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="exp-form-field exp-form-full">
                  <label className="exp-label">
                    Priority{" "}
                    <span style={{ fontWeight: 400, color: "#868e96" }}>
                      (1 = VIP / most important, 5 = filler)
                    </span>
                  </label>
                  <div className="priority-picker">
                    {[1, 2, 3, 4, 5].map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={`priority-btn ${(tableForm.priority || 3) === p ? "active" : ""}`}
                        style={{ "--p-color": PRIORITY_COLORS[p] }}
                        onClick={() =>
                          setTableForm((f) => ({ ...f, priority: p }))
                        }>
                        {p}
                        <span className="priority-btn-label">
                          {["", "VIP", "High", "Normal", "Low", "Filler"][p]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="exp-form-field exp-form-full">
                  <label className="exp-label">Assigned Guests</label>
                  <select
                    className="admin-input"
                    onChange={(e) => {
                      const name = e.target.value;
                      if (name && !tableForm.guests.includes(name))
                        setTableForm((f) => ({
                          ...f,
                          guests: [...f.guests, name],
                        }));
                      e.target.value = "";
                    }}>
                    <option value="">— Add a guest —</option>
                    {[...new Set(allRows.map((r) => r.name))]
                      .sort()
                      .filter((n) => !tableForm.guests.includes(n))
                      .map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                  </select>
                  <div className="table-assigned-tags">
                    {tableForm.guests.map((g) => (
                      <span key={g} className="table-guest-tag">
                        {g}
                        <button
                          onClick={() =>
                            setTableForm((f) => ({
                              ...f,
                              guests: f.guests.filter((x) => x !== g),
                            }))
                          }>
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="exp-form-field exp-form-full">
                  <label className="exp-label">Notes</label>
                  <textarea
                    className="admin-input exp-notes-input"
                    rows={2}
                    placeholder="e.g. Near stage, vegetarian side…"
                    value={tableForm.notes}
                    onChange={(e) =>
                      setTableForm((f) => ({ ...f, notes: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="admin-btn admin-btn-ghost"
                onClick={() => setTableForm(null)}>
                Cancel
              </button>
              <button
                className="admin-btn admin-btn-primary"
                disabled={!tableForm.name?.trim()}
                onClick={() =>
                  saveSimple("tables", tableForm, setTables, setTableForm)
                }>
                {tableForm.id ? "Save Changes" : "Add Table"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingTableId && (
        <div className="modal-overlay" onClick={() => setDeletingTableId(null)}>
          <div
            className="modal-box modal-box-sm"
            onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Table</h2>
              <button
                className="modal-close-btn"
                onClick={() => setDeletingTableId(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>
                Delete this table? <strong>Cannot be undone.</strong>
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="admin-btn admin-btn-ghost"
                onClick={() => setDeletingTableId(null)}>
                Cancel
              </button>
              <button
                className="admin-btn action-btn-delete"
                onClick={() =>
                  deleteSimple(
                    "tables",
                    deletingTableId,
                    setTables,
                    setDeletingTableId,
                  )
                }>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TO-DOS TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "todos" && (
        <div className="admin-content">
          <div className="fin-toolbar">
            <h2 className="fin-section-title">To-Do List</h2>
            <div className="fin-toolbar-actions">
              <button
                className="admin-btn admin-btn-ghost"
                onClick={() => fetchSimple("todos", setTodos)}>
                ↺ Refresh
              </button>
              <button
                className="admin-btn admin-btn-primary"
                onClick={() => setTodoForm({ ...EMPTY_TODO })}>
                + Add Task
              </button>
            </div>
          </div>

          {/* progress bar */}
          {todos.length > 0 &&
            (() => {
              const done = todos.filter((t) => t.status === "done").length;
              const pct = Math.round((done / todos.length) * 100);
              return (
                <div className="todo-progress-bar-wrap">
                  <div
                    className="todo-progress-bar"
                    style={{ width: `${pct}%` }}
                  />
                  <span className="todo-progress-label">
                    {done}/{todos.length} completed ({pct}%)
                  </span>
                </div>
              );
            })()}

          <div className="admin-card rsvp-table-card">
            <div className="preview-table-container">
              <table className="preview-table fin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Task</th>
                    <th>Due Date</th>
                    <th>Assignee</th>
                    <th>Status</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {todos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="rsvp-empty">
                        No tasks yet. Click "+ Add Task" to get started.
                      </td>
                    </tr>
                  ) : (
                    todos.map((t, i) => (
                      <tr
                        key={t.id}
                        className={`fin-row ${t.status === "done" ? "todo-row-done" : t.status === "in-progress" ? "todo-row-wip" : ""}`}>
                        <td className="rsvp-idx">{i + 1}</td>
                        <td
                          className="fin-name"
                          style={{
                            textDecoration:
                              t.status === "done" ? "line-through" : "none",
                          }}>
                          {t.title}
                        </td>
                        <td className="fin-date">
                          {t.dueDate
                            ? new Date(t.dueDate).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </td>
                        <td>{t.assignee || "—"}</td>
                        <td>
                          <span
                            className={`rsvp-badge ${t.status === "done" ? "badge-yes" : t.status === "in-progress" ? "badge-pending" : "badge-no"}`}>
                            {t.status === "done"
                              ? "✓ Done"
                              : t.status === "in-progress"
                                ? "⏳ In Progress"
                                : "◦ Pending"}
                          </span>
                        </td>
                        <td className="fin-notes">{t.notes || "—"}</td>
                        <td className="rsvp-actions">
                          <div className="rsvp-action-btns">
                            <button
                              className="admin-btn action-btn-edit"
                              onClick={() => setTodoForm({ ...t })}>
                              Edit
                            </button>
                            <button
                              className="admin-btn action-btn-delete"
                              onClick={() => setDeletingTodoId(t.id)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {todoForm && (
        <div className="modal-overlay" onClick={() => setTodoForm(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{todoForm.id ? "Edit Task" : "Add Task"}</h2>
              <button
                className="modal-close-btn"
                onClick={() => setTodoForm(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="exp-form-grid">
                <div className="exp-form-field exp-form-full">
                  <label className="exp-label">Task *</label>
                  <input
                    className="admin-input"
                    placeholder="e.g. Book florist, Send invitations…"
                    value={todoForm.title}
                    onChange={(e) =>
                      setTodoForm((f) => ({ ...f, title: e.target.value }))
                    }
                  />
                </div>
                <div className="exp-form-field">
                  <label className="exp-label">Due Date</label>
                  <input
                    className="admin-input"
                    type="date"
                    value={todoForm.dueDate}
                    onChange={(e) =>
                      setTodoForm((f) => ({ ...f, dueDate: e.target.value }))
                    }
                  />
                </div>
                <div className="exp-form-field">
                  <label className="exp-label">Assignee</label>
                  <input
                    className="admin-input"
                    placeholder="e.g. Justin, Yara…"
                    value={todoForm.assignee}
                    onChange={(e) =>
                      setTodoForm((f) => ({ ...f, assignee: e.target.value }))
                    }
                  />
                </div>
                <div className="exp-form-field">
                  <label className="exp-label">Status</label>
                  <select
                    className="admin-input"
                    value={todoForm.status}
                    onChange={(e) =>
                      setTodoForm((f) => ({ ...f, status: e.target.value }))
                    }>
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div className="exp-form-field exp-form-full">
                  <label className="exp-label">Notes</label>
                  <textarea
                    className="admin-input exp-notes-input"
                    rows={2}
                    value={todoForm.notes}
                    onChange={(e) =>
                      setTodoForm((f) => ({ ...f, notes: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="admin-btn admin-btn-ghost"
                onClick={() => setTodoForm(null)}>
                Cancel
              </button>
              <button
                className="admin-btn admin-btn-primary"
                disabled={!todoForm.title?.trim()}
                onClick={() =>
                  saveSimple("todos", todoForm, setTodos, setTodoForm)
                }>
                {todoForm.id ? "Save Changes" : "Add Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingTodoId && (
        <div className="modal-overlay" onClick={() => setDeletingTodoId(null)}>
          <div
            className="modal-box modal-box-sm"
            onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Task</h2>
              <button
                className="modal-close-btn"
                onClick={() => setDeletingTodoId(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>
                Delete this task? <strong>Cannot be undone.</strong>
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="admin-btn admin-btn-ghost"
                onClick={() => setDeletingTodoId(null)}>
                Cancel
              </button>
              <button
                className="admin-btn action-btn-delete"
                onClick={() =>
                  deleteSimple(
                    "todos",
                    deletingTodoId,
                    setTodos,
                    setDeletingTodoId,
                  )
                }>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VENDORS TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "vendors" && (
        <div className="admin-content">
          <div className="fin-toolbar">
            <h2 className="fin-section-title">Vendors</h2>
            <div className="fin-toolbar-actions">
              <button
                className="admin-btn admin-btn-ghost"
                onClick={() => fetchSimple("vendors", setVendors)}>
                ↺ Refresh
              </button>
              <button
                className="admin-btn admin-btn-primary"
                onClick={() => setVendorForm({ ...EMPTY_VENDOR })}>
                + Add Vendor
              </button>
            </div>
          </div>

          {/* quick-stats */}
          {vendors.length > 0 && (
            <div className="fin-summary">
              <div className="fin-stat-card fin-stat-total">
                <span className="fin-stat-amount">{vendors.length}</span>
                <span className="fin-stat-label">Total</span>
              </div>
              <div className="fin-stat-card fin-stat-paid">
                <span className="fin-stat-amount">
                  {vendors.filter((v) => v.status === "booked").length}
                </span>
                <span className="fin-stat-label">Booked</span>
              </div>
              <div className="fin-stat-card fin-stat-unpaid">
                <span className="fin-stat-amount">
                  {vendors.filter((v) => v.status === "not-booked").length}
                </span>
                <span className="fin-stat-label">Not Booked</span>
              </div>
            </div>
          )}

          <div className="admin-card rsvp-table-card">
            <div className="preview-table-container">
              <table className="preview-table fin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Contact</th>
                    <th>Quoted Price</th>
                    <th>Paid</th>
                    <th>Remaining</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="rsvp-empty">
                        No vendors yet. Click "+ Add Vendor".
                      </td>
                    </tr>
                  ) : (
                    vendors.map((v, i) => {
                      const vt = vendorTotals(v.id);
                      const isExpanded = expandedVendorId === v.id;
                      return (
                        <>
                          <tr
                            key={v.id}
                            className={`fin-row ${v.status === "booked" ? "fin-row-paid" : "fin-row-unpaid"}`}>
                            <td className="rsvp-idx">{i + 1}</td>
                            <td className="fin-name">
                              <button
                                className="vendor-expand-btn"
                                onClick={() =>
                                  setExpandedVendorId(isExpanded ? null : v.id)
                                }
                                title={
                                  isExpanded
                                    ? "Collapse"
                                    : "Show linked expenses"
                                }>
                                {isExpanded ? "▾" : "▸"}
                              </button>
                              {v.name}
                              {vt.linked.length > 0 && (
                                <span className="vendor-exp-count">
                                  {vt.linked.length} exp.
                                </span>
                              )}
                            </td>
                            <td className="fin-category">{v.type || "—"}</td>
                            <td>
                              <span
                                className={`rsvp-badge ${v.status === "booked" ? "badge-yes" : "badge-no"}`}>
                                {v.status === "booked"
                                  ? "✓ Booked"
                                  : "✗ Not Booked"}
                              </span>
                            </td>
                            <td className="fin-category">{v.contact || "—"}</td>
                            <td className="fin-amount">
                              {v.price ? fmt(parseFloat(v.price)) : "—"}
                            </td>
                            <td className="fin-amount fin-paid-cell">
                              {vt.linked.length > 0 ? (
                                <span className="vendor-paid">
                                  {fmt(vt.paid)}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="fin-amount fin-unpaid-cell">
                              {vt.linked.length > 0 ? (
                                <span
                                  className={`vendor-remaining ${vt.remaining > 0 ? "has-remaining" : "fully-paid"}`}>
                                  {fmt(vt.remaining)}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="fin-notes">{v.notes || "—"}</td>
                            <td className="rsvp-actions">
                              <div className="rsvp-action-btns">
                                <button
                                  className="admin-btn action-btn-edit"
                                  onClick={() => setVendorForm({ ...v })}>
                                  Edit
                                </button>
                                <button
                                  className="admin-btn action-btn-delete"
                                  onClick={() => setDeletingVendorId(v.id)}>
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr
                              key={`${v.id}-detail`}
                              className="vendor-detail-row">
                              <td colSpan={10}>
                                {vt.linked.length === 0 ? (
                                  <p className="vendor-detail-empty">
                                    No expenses linked to this vendor yet. Link
                                    them from the Financials tab.
                                  </p>
                                ) : (
                                  <div className="vendor-detail-wrap">
                                    <div className="vendor-detail-bar">
                                      <span className="vd-label">
                                        Total linked
                                      </span>
                                      <span className="vd-val">
                                        {fmt(vt.total)}
                                      </span>
                                      <span className="vd-sep" />
                                      <span className="vd-label vd-paid">
                                        Paid
                                      </span>
                                      <span className="vd-val vd-paid">
                                        {fmt(vt.paid)}
                                      </span>
                                      <span className="vd-sep" />
                                      <span className="vd-label vd-rem">
                                        Remaining
                                      </span>
                                      <span className="vd-val vd-rem">
                                        {fmt(vt.remaining)}
                                      </span>
                                    </div>
                                    <div className="vendor-progress-wrap">
                                      <div
                                        className="vendor-progress-fill"
                                        style={{
                                          width:
                                            vt.total > 0
                                              ? `${(vt.paid / vt.total) * 100}%`
                                              : "0%",
                                        }}
                                      />
                                    </div>
                                    <table className="vendor-linked-table">
                                      <thead>
                                        <tr>
                                          <th>Expense</th>
                                          <th>Wedding</th>
                                          <th>Amount</th>
                                          <th>Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {vt.linked.map((e) => (
                                          <tr key={e.id}>
                                            <td>{e.name}</td>
                                            <td className="fin-category">
                                              {expenses.find(
                                                (x) => x.id === e.id,
                                              )
                                                ? "Cyprus"
                                                : "Lebanon"}
                                            </td>
                                            <td className="fin-amount">
                                              {fmt(e.amount)}
                                            </td>
                                            <td>
                                              <span
                                                className={`rsvp-badge ${e.status === "paid" ? "badge-yes" : "badge-no"}`}>
                                                {e.status === "paid"
                                                  ? "✓ Paid"
                                                  : "✗ Unpaid"}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {vendorForm && (
        <div className="modal-overlay" onClick={() => setVendorForm(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{vendorForm.id ? "Edit Vendor" : "Add Vendor"}</h2>
              <button
                className="modal-close-btn"
                onClick={() => setVendorForm(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="exp-form-grid">
                <div className="exp-form-field exp-form-full">
                  <label className="exp-label">Vendor Name *</label>
                  <input
                    className="admin-input"
                    placeholder="e.g. Rose Garden Florist"
                    value={vendorForm.name}
                    onChange={(e) =>
                      setVendorForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                <div className="exp-form-field">
                  <label className="exp-label">Type</label>
                  <select
                    className="admin-input"
                    value={vendorForm.type}
                    onChange={(e) =>
                      setVendorForm((f) => ({ ...f, type: e.target.value }))
                    }>
                    <option value="">— Select —</option>
                    {VENDOR_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="exp-form-field">
                  <label className="exp-label">Status</label>
                  <select
                    className="admin-input"
                    value={vendorForm.status}
                    onChange={(e) =>
                      setVendorForm((f) => ({ ...f, status: e.target.value }))
                    }>
                    <option value="not-booked">Not Booked</option>
                    <option value="booked">Booked</option>
                  </select>
                </div>
                <div className="exp-form-field">
                  <label className="exp-label">Contact</label>
                  <input
                    className="admin-input"
                    placeholder="Phone / email…"
                    value={vendorForm.contact}
                    onChange={(e) =>
                      setVendorForm((f) => ({ ...f, contact: e.target.value }))
                    }
                  />
                </div>
                <div className="exp-form-field">
                  <label className="exp-label">Price</label>
                  <input
                    className="admin-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={vendorForm.price}
                    onChange={(e) =>
                      setVendorForm((f) => ({ ...f, price: e.target.value }))
                    }
                  />
                </div>
                <div className="exp-form-field exp-form-full">
                  <label className="exp-label">Notes</label>
                  <textarea
                    className="admin-input exp-notes-input"
                    rows={2}
                    value={vendorForm.notes}
                    onChange={(e) =>
                      setVendorForm((f) => ({ ...f, notes: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="admin-btn admin-btn-ghost"
                onClick={() => setVendorForm(null)}>
                Cancel
              </button>
              <button
                className="admin-btn admin-btn-primary"
                disabled={!vendorForm.name?.trim()}
                onClick={() =>
                  saveSimple("vendors", vendorForm, setVendors, setVendorForm)
                }>
                {vendorForm.id ? "Save Changes" : "Add Vendor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingVendorId && (
        <div
          className="modal-overlay"
          onClick={() => setDeletingVendorId(null)}>
          <div
            className="modal-box modal-box-sm"
            onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Vendor</h2>
              <button
                className="modal-close-btn"
                onClick={() => setDeletingVendorId(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>
                Delete this vendor? <strong>Cannot be undone.</strong>
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="admin-btn admin-btn-ghost"
                onClick={() => setDeletingVendorId(null)}>
                Cancel
              </button>
              <button
                className="admin-btn action-btn-delete"
                onClick={() =>
                  deleteSimple(
                    "vendors",
                    deletingVendorId,
                    setVendors,
                    setDeletingVendorId,
                  )
                }>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Branding Tab ──────────────────────────────────────────────────── */}
      {activeTab === "branding" && (
        <div className="admin-content">
          <BrandingTab clientConfig={clientConfig} />
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
