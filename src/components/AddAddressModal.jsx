import React, { useEffect, useState, useMemo } from "react";
import {
  FiX,
  FiUser,
  FiPhone,
  FiHome,
  FiMapPin,
  FiHash,
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
  FiStar,
} from "react-icons/fi";

import "../styles/AddAddressModal.css";

const emptyAddress = {
  label: "Home",
  fullName: "",
  phone: "",
  house: "",
  area: "",
  city: "",
  state: "",
  pincode: "",
  landmark: "",
  isDefault: false,
};

const STATE_CITY_MAP = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Nellore"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Durg"],
  "Delhi": ["New Delhi", "Dwarka", "Rohini", "Saket"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Sanand", "Gandhinagar"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala"],
  "Karnataka": ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi"],
  "Kerala": ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Noida", "Ghaziabad", "Varanasi", "Agra"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Nainital"],
  "West Bengal": ["Kolkata", "Howrah", "Siliguri", "Durgapur"],
};

const STATE_LIST = Object.keys(STATE_CITY_MAP).sort();
const OTHER_OPTION = "__OTHER__";
const LABEL_OPTIONS = ["Home", "Office", "Other"];
const REQUIRED_FIELDS = ["fullName", "phone", "house", "city", "state", "pincode"];

const FIELD_TITLES = {
  fullName: "Full name",
  phone: "Phone number",
  house: "House / Flat",
  city: "City",
  state: "State",
  pincode: "Pincode",
};

const AddAddressModal = ({ onClose, onSave, editAddress, serverError, saving }) => {
  const [address, setAddress] = useState(emptyAddress);
  const [pincodeStatus, setPincodeStatus] = useState(""); // "loading" | "found" | "error" | ""
  const [stateMode, setStateMode] = useState("select");
  const [cityMode, setCityMode] = useState("select");
  const [touched, setTouched] = useState({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // ==========================
  // LOAD EDIT DATA
  // ==========================

  useEffect(() => {
    if (editAddress) {
      setAddress({ ...emptyAddress, ...editAddress });

      const knownState = STATE_LIST.includes(editAddress.state);
      setStateMode(knownState ? "select" : "manual");

      const knownCity =
        knownState && STATE_CITY_MAP[editAddress.state]?.includes(editAddress.city);
      setCityMode(knownCity ? "select" : "manual");
    } else {
      setAddress(emptyAddress);
      setStateMode("select");
      setCityMode("select");
    }
    setTouched({});
    setAttemptedSubmit(false);
    setPincodeStatus("");
  }, [editAddress]);

  // ==========================
  // AUTO FILL CITY/STATE FROM PINCODE
  // ==========================

  useEffect(() => {
    const pin = address.pincode;

    if (!/^\d{6}$/.test(pin)) {
      setPincodeStatus("");
      return;
    }

    let cancelled = false;

    const fetchLocation = async () => {
      setPincodeStatus("loading");

      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();

        if (cancelled) return;

        const result = data && data[0];

        if (result?.Status === "Success" && result.PostOffice?.length > 0) {
          const office = result.PostOffice[0];
          const fetchedState = office.State || "";
          const fetchedCity = office.District || "";

          setAddress((prev) => ({
            ...prev,
            state: fetchedState || prev.state,
            city: fetchedCity || prev.city,
          }));

          const knownState = STATE_LIST.includes(fetchedState);
          setStateMode(knownState ? "select" : "manual");

          const knownCity =
            knownState && STATE_CITY_MAP[fetchedState]?.includes(fetchedCity);
          setCityMode(knownCity ? "select" : "manual");

          setPincodeStatus("found");
        } else {
          setPincodeStatus("error");
        }
      } catch (error) {
        console.error("Pincode lookup error:", error);
        if (!cancelled) setPincodeStatus("error");
      }
    };

    fetchLocation();

    return () => {
      cancelled = true;
    };
  }, [address.pincode]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddress((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleBlur = (e) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  };

  const handleStateSelect = (e) => {
    const value = e.target.value;

    if (value === OTHER_OPTION) {
      setStateMode("manual");
      setAddress((prev) => ({ ...prev, state: "", city: "" }));
      setCityMode("manual");
      return;
    }

    setAddress((prev) => ({ ...prev, state: value, city: "" }));
    setCityMode("select");
    setTouched((prev) => ({ ...prev, state: true }));
  };

  const handleCitySelect = (e) => {
    const value = e.target.value;

    if (value === OTHER_OPTION) {
      setCityMode("manual");
      setAddress((prev) => ({ ...prev, city: "" }));
      return;
    }

    setAddress((prev) => ({ ...prev, city: value }));
    setTouched((prev) => ({ ...prev, city: true }));
  };

  const citiesForSelectedState = STATE_CITY_MAP[address.state] || [];

  const missingFields = useMemo(
    () => REQUIRED_FIELDS.filter((f) => !String(address[f] || "").trim()),
    [address]
  );

  const isFieldInvalid = (field) =>
    (touched[field] || attemptedSubmit) && missingFields.includes(field);

  const handleSubmit = () => {
    setAttemptedSubmit(true);
    if (missingFields.length > 0) return;
    onSave(address);
  };

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  return (
    <div className="address-overlay" onMouseDown={handleClose}>
      <div
        className="address-modal"
        role="dialog"
        aria-modal="true"
        aria-label={editAddress ? "Edit address" : "Add new address"}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="address-drag-handle" />

        {/* HEADER */}
        <div className="address-header">
          <div>
            <span className="address-eyebrow">
              {editAddress ? "Editing" : "New address"}
            </span>
            <h2>{editAddress ? "Edit Address" : "Add New Address"}</h2>
          </div>

          <button
            type="button"
            className="address-close-btn"
            onClick={handleClose}
            disabled={saving}
            aria-label="Close"
          >
            <FiX />
          </button>
        </div>

        {/* BODY */}
        <div className="address-body">
          {serverError && (
            <div className="address-banner address-banner-error">
              <FiAlertCircle />
              <span>{serverError}</span>
            </div>
          )}

          {attemptedSubmit && missingFields.length > 0 && (
            <div className="address-banner address-banner-error">
              <FiAlertCircle />
              <span>
                Please fill in: {missingFields.map((f) => FIELD_TITLES[f]).join(", ")}
              </span>
            </div>
          )}

          {/* LABEL SEGMENTED CONTROL */}
          <div className="field-group">
            <label className="field-label">Save this address as</label>
            <div className="segmented-control" role="radiogroup">
              {LABEL_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  role="radio"
                  aria-checked={address.label === opt}
                  className={`segmented-option ${
                    address.label === opt ? "is-active" : ""
                  }`}
                  onClick={() => setAddress((prev) => ({ ...prev, label: opt }))}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* SECTION: CONTACT */}
          <p className="section-title">Contact details</p>

          <div className="field-row">
            <div className="field-group">
              <label className="field-label" htmlFor="fullName">
                Full name *
              </label>
              <div className={`input-icon-wrap ${isFieldInvalid("fullName") ? "is-invalid" : ""}`}>
                <FiUser className="input-icon" />
                <input
                  id="fullName"
                  name="fullName"
                  value={address.fullName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="e.g. Priya Sharma"
                  autoComplete="name"
                />
              </div>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="phone">
                Phone number *
              </label>
              <div className={`input-icon-wrap ${isFieldInvalid("phone") ? "is-invalid" : ""}`}>
                <FiPhone className="input-icon" />
                <input
                  id="phone"
                  name="phone"
                  value={address.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="10-digit mobile number"
                  inputMode="numeric"
                  maxLength={10}
                  autoComplete="tel"
                />
              </div>
            </div>
          </div>

          <div className="stitch-divider" />

          {/* SECTION: ADDRESS */}
          <p className="section-title">Delivery address</p>

          <div className="field-group">
            <label className="field-label" htmlFor="pincode">
              Pincode *
            </label>
            <div className={`input-icon-wrap ${isFieldInvalid("pincode") ? "is-invalid" : ""}`}>
              <FiHash className="input-icon" />
              <input
                id="pincode"
                name="pincode"
                value={address.pincode}
                onChange={handleChange}
                onBlur={handleBlur}
                maxLength={6}
                inputMode="numeric"
                placeholder="6-digit pincode"
              />
              {pincodeStatus === "loading" && (
                <FiLoader className="input-status-icon spin" />
              )}
              {pincodeStatus === "found" && (
                <FiCheckCircle className="input-status-icon status-success" />
              )}
              {pincodeStatus === "error" && (
                <FiAlertCircle className="input-status-icon status-error" />
              )}
            </div>
            {pincodeStatus === "loading" && (
              <small className="field-hint">Looking up city &amp; state…</small>
            )}
            {pincodeStatus === "found" && (
              <small className="field-hint field-hint-success">
                City &amp; state auto-filled — review below.
              </small>
            )}
            {pincodeStatus === "error" && (
              <small className="field-hint field-hint-error">
                Couldn't find this pincode. Enter city &amp; state manually.
              </small>
            )}
          </div>

          <div className="field-row">
            {/* STATE */}
            <div className="field-group">
              <label className="field-label">State *</label>
              {stateMode === "select" ? (
                <div className={`select-wrap ${isFieldInvalid("state") ? "is-invalid" : ""}`}>
                  <select value={address.state} onChange={handleStateSelect} onBlur={handleBlur} name="state">
                    <option value="">Select state</option>
                    {STATE_LIST.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                    <option value={OTHER_OPTION}>Other (enter manually)</option>
                  </select>
                </div>
              ) : (
                <div className="manual-field-row">
                  <div className={`input-icon-wrap ${isFieldInvalid("state") ? "is-invalid" : ""}`}>
                    <FiMapPin className="input-icon" />
                    <input
                      name="state"
                      value={address.state}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter state"
                    />
                  </div>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => {
                      setStateMode("select");
                      setAddress((prev) => ({ ...prev, state: "", city: "" }));
                      setCityMode("select");
                    }}
                  >
                    Choose from list
                  </button>
                </div>
              )}
            </div>

            {/* CITY */}
            <div className="field-group">
              <label className="field-label">City *</label>
              {cityMode === "select" ? (
                <div className={`select-wrap ${isFieldInvalid("city") ? "is-invalid" : ""}`}>
                  <select
                    value={address.city}
                    onChange={handleCitySelect}
                    onBlur={handleBlur}
                    name="city"
                    disabled={!address.state}
                  >
                    <option value="">
                      {address.state ? "Select city" : "Select state first"}
                    </option>
                    {citiesForSelectedState.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value={OTHER_OPTION}>Other (enter manually)</option>
                  </select>
                </div>
              ) : (
                <div className="manual-field-row">
                  <div className={`input-icon-wrap ${isFieldInvalid("city") ? "is-invalid" : ""}`}>
                    <FiMapPin className="input-icon" />
                    <input
                      name="city"
                      value={address.city}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter city"
                    />
                  </div>
                  {citiesForSelectedState.length > 0 && (
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => {
                        setCityMode("select");
                        setAddress((prev) => ({ ...prev, city: "" }));
                      }}
                    >
                      Choose from list
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="house">
              House / Flat *
            </label>
            <div className={`input-icon-wrap ${isFieldInvalid("house") ? "is-invalid" : ""}`}>
              <FiHome className="input-icon" />
              <input
                id="house"
                name="house"
                value={address.house}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Flat no., House no., Building"
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field-group">
              <label className="field-label" htmlFor="area">
                Area / Street
              </label>
              <div className="input-icon-wrap">
                <FiMapPin className="input-icon" />
                <input
                  id="area"
                  name="area"
                  value={address.area}
                  onChange={handleChange}
                  placeholder="Area, street, sector"
                />
              </div>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="landmark">
                Landmark
              </label>
              <div className="input-icon-wrap">
                <FiMapPin className="input-icon" />
                <input
                  id="landmark"
                  name="landmark"
                  value={address.landmark}
                  onChange={handleChange}
                  placeholder="Nearby landmark (optional)"
                />
              </div>
            </div>
          </div>

          <div className="stitch-divider" />

          <label className="default-toggle-row">
            <span className="default-toggle-label">
              <FiStar />
              Set as default address
            </span>
            <span className="toggle-switch">
              <input
                type="checkbox"
                name="isDefault"
                checked={address.isDefault}
                onChange={handleChange}
              />
              <span className="toggle-track">
                <span className="toggle-thumb" />
              </span>
            </span>
          </label>
        </div>

        {/* FOOTER */}
        <div className="address-footer">
          <button className="cancel-btn" onClick={handleClose} disabled={saving}>
            Cancel
          </button>

          <button className="save-btn" onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <FiLoader className="spin" />
                Saving…
              </>
            ) : editAddress ? (
              "Update Address"
            ) : (
              "Save Address"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddAddressModal;