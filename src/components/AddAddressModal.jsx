import React, { useEffect, useState } from "react";

import "../styles/AddAddressModal.css";
import { FaPlus } from "react-icons/fa";
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

const AddAddressModal = ({ onClose, onSave, editAddress }) => {
  const [address, setAddress] = useState(emptyAddress);

  // ==========================
  // LOAD EDIT DATA
  // ==========================

  useEffect(() => {
    if (editAddress) {
      setAddress(editAddress);
    } else {
      setAddress(emptyAddress);
    }
  }, [editAddress]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setAddress({
      ...address,

      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = () => {
    if (
      !address.fullName ||
      !address.phone ||
      !address.house ||
      !address.city ||
      !address.state ||
      !address.pincode
    ) {
      alert("Please fill all required fields.");

      return;
    }

    onSave(address);
  };

  return (
    <div className="address-overlay">
      <div className="address-modal">
        {/* HEADER */}
    
        <div className="address-header">
          <h2>{editAddress ? "Edit Address" : "Add New Address"}</h2>

          <button onClick={onClose}>✕</button>
        </div>

        {/* BODY */}

        <div className="address-body">
          <label>Address Label</label>

          <select name="label" value={address.label} onChange={handleChange}>
            <option>Home</option>

            <option>Office</option>

            <option>Other</option>
          </select>

          <label>Full Name *</label>

          <input
            name="fullName"
            value={address.fullName}
            onChange={handleChange}
            placeholder="Enter full name"
          />

          <label>Phone Number *</label>

          <input
            name="phone"
            value={address.phone}
            onChange={handleChange}
            placeholder="9876543210"
          />

          <label>House / Flat *</label>

          <input
            name="house"
            value={address.house}
            onChange={handleChange}
            placeholder="Flat no, House no"
          />

          <label>Area</label>

          <input
            name="area"
            value={address.area}
            onChange={handleChange}
            placeholder="Area / Street"
          />

          <label>City *</label>

          <input name="city" value={address.city} onChange={handleChange} />

          <label>State *</label>

          <input name="state" value={address.state} onChange={handleChange} />

          <label>Pincode *</label>

          <input
            name="pincode"
            value={address.pincode}
            onChange={handleChange}
          />

          <label>Landmark</label>

          <input
            name="landmark"
            value={address.landmark}
            onChange={handleChange}
          />

          <label className="checkbox-row">
            <input
              type="checkbox"
              name="isDefault"
              checked={address.isDefault}
              onChange={handleChange}
            />
            Set as Default Address
          </label>
        </div>

        {/* FOOTER */}

        <div className="address-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>

          <button className="save-btn" onClick={handleSubmit}>
            {editAddress ? "Update Address" : "Save Address"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddAddressModal;
