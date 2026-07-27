"use client";

export function Input({ label, name, type = "text", value, onChange, placeholder, error, required = false, disabled = false, className = "", icon }) {
  return (
    <div className={"space-y-1 " + className}>
      {label && (
        <label htmlFor={name} className="block text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-1">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        id={name}
        name={name}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={"input-field " + (error ? "border-error focus:ring-error/20" : "") + (icon ? "pl-10" : "")}
      />
      {error && <p className="text-[12px] text-error font-medium mt-1">{error}</p>}
    </div>
  );
}

export function Textarea({ label, name, value, onChange, placeholder, error, rows = 4, required = false, className = "" }) {
  return (
    <div className={"space-y-1 " + className}>
      {label && (
        <label htmlFor={name} className="block text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-1">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        required={required}
        className={"input-field resize-none " + (error ? "border-error focus:ring-error/20" : "")}
      />
      {error && <p className="text-[12px] text-error font-medium mt-1">{error}</p>}
    </div>
  );
}

export function Select({ label, name, value, onChange, options = [], error, required = false, placeholder, disabled = false, className = "" }) {
  return (
    <div className={"space-y-1 " + className}>
      {label && (
        <label htmlFor={name} className="block text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider mb-1">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value || ""}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={"input-field cursor-pointer " + (error ? "border-error focus:ring-error/20" : "")}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(function (opt) {
          var optValue = typeof opt === "string" ? opt : opt.value;
          var optLabel = typeof opt === "string" ? opt : opt.label;
          return <option key={optValue} value={optValue}>{optLabel}</option>;
        })}
      </select>
      {error && <p className="text-[12px] text-error font-medium mt-1">{error}</p>}
    </div>
  );
}
