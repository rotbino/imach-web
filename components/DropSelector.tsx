// components/common/DropSelector.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search } from "lucide-react";

type Option = {
    value?: string;
    label?: string;
    extra?: any;
    className?: string;
    disabled?: boolean;
};

interface DropSelectorProps {
    value: string;
    options: Option[];
    placeholder?: string;
    onChange: (value: string, option: Option) => void;
    renderOption?: (option: Option) => React.ReactNode;
    disabled?: boolean;
    className?: string;
    error?: string;
    label?: string;
    required?: boolean;
}

export function DropSelector({
                                 value,
                                 options,
                                 placeholder = "انتخاب کنید...",
                                 onChange,
                                 renderOption,
                                 disabled = false,
                                 className = "",
                                 error,
                                 label,
                                 required = false,
                             }: DropSelectorProps) {
    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState({ top: 0, left: 0, width: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const haveSearch = options.length > 10;

    const normalizedOptions = options.map((o) => ({
        value: o.value ?? "",
        label: o.label ?? "",
        ...o,
    }));

    const selectedOption = normalizedOptions.find((o) => o.value === value);

    const filtered = normalizedOptions.filter(
        (o) =>
            o.label.toLowerCase().includes(search.toLowerCase()) ||
            o.value.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                containerRef.current && !containerRef.current.contains(event.target as Node) &&
                menuRef.current && !menuRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
                setSearch("");
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const updateMenuPosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuStyle({
                top: rect.bottom + 4,
                left: rect.left,
                width: Math.max(rect.width, 200),
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updateMenuPosition();
            window.addEventListener('scroll', updateMenuPosition, true);
            window.addEventListener('resize', updateMenuPosition);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
        return () => {
            window.removeEventListener('scroll', updateMenuPosition, true);
            window.removeEventListener('resize', updateMenuPosition);
        };
    }, [isOpen]);

    const handleSelect = (option: { value: string; label: string }) => {
        onChange(option.value, option);
        setIsOpen(false);
        setSearch("");
        buttonRef.current?.focus();
    };

    return (
        <div className="w-full" ref={containerRef}>
            {label && (
                <label className="text-xs text-on-surface-variant block mb-1">
                    {label}
                    {required && <span className="text-primary mr-1">*</span>}
                </label>
            )}

            <div className="relative">
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={() => {
                        if (!disabled) {
                            updateMenuPosition();
                            setIsOpen(!isOpen);
                        }
                    }}
                    disabled={disabled}
                    className={`w-full bg-surface-container-lowest border h-8 px-3 py-6 text-xs text-right flex items-center justify-between transition-all ${
                        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-surface-container-low"
                    } ${
                        error ? "border-error" : "border-outline"
                    } ${
                        isOpen ? "ring-1 ring-primary border-primary" : ""
                    } rounded ${className}`}
                >
                    <span className={`truncate ${selectedOption ? "text-on-surface" : "text-on-surface-variant"}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronDown
                        size={14}
                        className={`flex-shrink-0 text-on-surface-variant transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                        } ${disabled ? "opacity-50" : ""}`}
                    />
                </button>

                {isOpen && createPortal(
                    <div
                        ref={menuRef}
                        className="fixed bg-surface-container-lowest border border-outline shadow-2xl z-[9999] max-h-96 overflow-hidden rounded-xl"
                        style={{
                            top: `${menuStyle.top}px`,
                            left: `${menuStyle.left}px`,
                            width: `${menuStyle.width}px`,
                        }}
                    >
                        {haveSearch && (
                            <div className="p-2 sticky top-0 bg-surface-container-lowest border-b border-outline-variant z-10">
                                <div className="relative">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        placeholder="جستجو..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full bg-surface-container-low border  py-5 border-outline rounded h-8 px-3 pr-8 text-xs text-right focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                                    />
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant" />
                                </div>
                            </div>
                        )}

                        <div className="max-h-72 overflow-y-auto">
                            {filtered.length > 0 ? (
                                filtered.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => !option.disabled && handleSelect(option)}
                                        className={`flex items-center justify-between w-full px-3 py-2 text-right transition-colors ${
                                            option.disabled
                                                ? "text-on-surface-variant/50 cursor-not-allowed"
                                                : "hover:bg-surface-container-low"
                                        } ${
                                            value === option.value ? "bg-primary/5" : ""
                                        }`}
                                        disabled={option.disabled}
                                    >
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            {renderOption ? renderOption(option) : (
                                                <span className="text-xs text-on-surface">{option.label}</span>
                                            )}
                                        </div>
                                        {value === option.value && !option.disabled && (
                                            <Check size={14} className="text-primary flex-shrink-0" />
                                        )}
                                    </button>
                                ))
                            ) : (
                                <div className="px-3 py-6 text-on-surface-variant text-center text-xs">
                                    نتیجه‌ای پیدا نشد
                                </div>
                            )}
                        </div>
                    </div>,
                    document.body
                )}
            </div>

            {error && <p className="text-error text-[10px] mt-1">{error}</p>}
        </div>
    );
}