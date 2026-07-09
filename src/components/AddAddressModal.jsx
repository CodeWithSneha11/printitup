import React, { useState } from "react";
import "./AddAddressModal.css";

const AddAddressModal = ({ onClose, onSave }) => {
  const [address, setAddress] = useState({
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
  });

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

        <div className="address-header">
          <h2>Add New Address</h2>

          <button onClick={onClose}>✕</button>
        </div>

        <div className="address-body">

          <label>Address Label</label>

          <select
            name="label"
            value={address.label}
            onChange={handleChange}
          >
            <option>Home</option>
            <option>Office</option>
            <option>Other</option>
          </select>

          <label>Full Name</label>

          <input
            name="fullName"
            value={address.fullName}
            onChange={handleChange}
          />

          <label>Phone Number</label>

          <input
            name="phone"
            value={address.phone}
            onChange={handleChange}
          />

          <label>House / Flat</label>

          <input
            name="house"
            value={address.house}
            onChange={handleChange}
          />

          <label>Area</label>

          <input
            name="area"
            value={address.area}
            onChange={handleChange}
          />

          <label>City</label>

          <input
            name="city"
            value={address.city}
            onChange={handleChange}
          />

          <label>State</label>

          <input
            name="state"
            value={address.state}
            onChange={handleChange}
          />

          <label>Pincode</label>

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

        <div className="address-footer">

          <button
            className="cancel-btn"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            className="save-btn"
            onClick={handleSubmit}
          >
            Save Address
          </button>

        </div>

      </div>
    </div>
  );
};

export default AddAddressModal;