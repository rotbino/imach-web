// components/common/NumberInput.tsx
import React from "react";

interface NumberInputProps {
    value: number | undefined;
    onChange: (value: number) => void;
    unit?: string; // مثل "ریال" یا "تومان"
    className?: string;
    placeholder?: string;
    disabled?: boolean;
    textAlign?: 'left' | 'center' | 'right';
    unitClassName?: string
}

export const NumberInput: React.FC<NumberInputProps> = ({
                                                            value,
                                                            onChange,
                                                            unit,
                                                            className = '',
                                                            placeholder,
                                                            disabled = false,
                                                            textAlign = 'center',
                                                            unitClassName,
                                                            ...rest
                                                        }) => {
    // ✅ تبدیل عدد به فارسی با فرمت سه رقمی
    const formatValue = (val: number | undefined): string => {
        if (!val || val === 0) return '';
        const formatted = val.toLocaleString('en-US');
        const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return formatted.replace(/\d/g, (d) => persianDigits[parseInt(d)]);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value
            .replace(/,/g, '')
            .replace(/[۰-۹]/g, (d) => {
                const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
                return persianDigits.indexOf(d).toString();
            })
            .replace(/\D/g, '');

        const num = raw ? Number(raw) : 0;
        onChange(num);
    };

    const textAlignClass = {
        'left': 'text-left',
        'center': 'text-center',
        'right': 'text-right',
    }[textAlign] || 'text-center';

    return (
        <div className="relative w-full">
            <input
                {...rest}
                type="text"
                inputMode="numeric"
                dir="auto"
                value={formatValue(value)}
                onChange={handleChange}
                placeholder={placeholder}
                disabled={disabled}
                style={{textAlign:"center"}}
                className={`w-full bg-surface-container-lowest border border-outline px-3 py-2 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all rounded-lg text-center ${className}`}
            />
            {unit && (
                <span className={`absolute text-xs top-1/2 left-3 -translate-y-1/2 text-on-surface-variant  pointer-events-none  ${unitClassName}`}>
                    {unit}
                </span>
            )}
        </div>
    );
};