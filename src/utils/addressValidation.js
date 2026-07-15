// Single source of truth for address field rules.
// Import this from both AddAddressModal (real-time, per-field feedback)
// and ManageAddress (final check right before writing to Firestore) so
// the two never drift apart.

export const NAME_REGEX = /^[A-Za-z\s.'-]{2,60}$/;
export const PHONE_REGEX = /^[6-9]\d{9}$/; // 10-digit Indian mobile, doesn't start with 0-5
export const PINCODE_REGEX = /^[1-9]\d{5}$/; // 6-digit Indian PIN, doesn't start with 0

// Validates a single field. Returns an error string, or "" if valid.
// `value` should be the raw (untrimmed) field value as typed.
export const validateField = (name, value) => {
  const trimmed = (value ?? "").trim();

  switch (name) {
    case "label":
      if (!trimmed) return "Address label is required.";
      if (trimmed.length > 30) return "Label must be under 30 characters.";
      return "";

    case "fullName":
      if (!trimmed) return "Full name is required.";
      if (!NAME_REGEX.test(trimmed))
        return "Only letters and spaces, 2-60 characters.";
      return "";

    case "phone":
      if (!trimmed) return "Phone number is required.";
      if (!PHONE_REGEX.test(trimmed))
        return "Enter a valid 10-digit mobile number (starts 6-9).";
      return "";

    case "house":
      if (!trimmed) return "House / flat / building is required.";
      return "";

    case "area":
      if (!trimmed) return "Area / street is required.";
      return "";

    case "city":
      if (!trimmed) return "City is required.";
      if (!NAME_REGEX.test(trimmed)) return "Only letters and spaces.";
      return "";

    case "state":
      if (!trimmed) return "State is required.";
      if (!NAME_REGEX.test(trimmed)) return "Only letters and spaces.";
      return "";

    case "pincode":
      if (!trimmed) return "Pincode is required.";
      if (!PINCODE_REGEX.test(trimmed)) return "Enter a valid 6-digit pincode.";
      return "";

    case "landmark":
      if (trimmed.length > 80) return "Landmark must be under 80 characters.";
      return "";

    default:
      return "";
  }
};

// Validates the whole address object at once.
// Returns { isValid, fieldErrors, errorList }.
export const validateAddress = (address) => {
  const fields = [
    "label",
    "fullName",
    "phone",
    "house",
    "area",
    "city",
    "state",
    "pincode",
    "landmark",
  ];

  const fieldErrors = {};

  fields.forEach((field) => {
    const error = validateField(field, address[field]);
    if (error) fieldErrors[field] = error;
  });

  return {
    isValid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    errorList: Object.values(fieldErrors),
  };
};

// Trims every string field so accidental leading/trailing spaces never
// get saved (a common source of "duplicate but different" addresses).
export const sanitizeAddress = (address) => {
  const sanitized = { ...address };

  Object.keys(sanitized).forEach((key) => {
    if (typeof sanitized[key] === "string") {
      sanitized[key] = sanitized[key].trim();
    }
  });

  return sanitized;
};