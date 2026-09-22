import React, { ReactElement, cloneElement } from "react";

interface FloatingWrapperProps {
    label: string;
    icon?: React.ReactNode;
    id: string;
    children: ReactElement; // حتماً یک عنصر React باشد که قابل فوکوس است
}

export const FloatingLabel: React.FC<FloatingWrapperProps> = ({ label, icon, id, children }) => {
    const childWithProps = cloneElement(children, {
        id,
        className: `peer w-full text-right bg-white border-2 border-gray-200 rounded-xl h-14
            focus:border-gray-400 focus:outline-none focus:ring-0
            ${icon ? "pr-10" : "pr-3"} ${children.props.className ?? ""}`,
        dir: "rtl",
        placeholder: " ",
    });

    return (
        <div className="relative pt-2 w-full">
            {childWithProps}
            <label
                htmlFor={id}
                className={`absolute text-gray-400 text-sm transition-all bg-white px-1 cursor-text
                    ${icon ? "right-10" : "right-3"}
                    ${children.props.value ? 'top-0 text-sm right-3' : 'top-1/2 -translate-y-1/2 text-base'}
                    peer-focus:top-0 peer-focus:right-3 peer-focus:text-sm`}
            >
                {label}
            </label>
            {icon && <div className="absolute right-3 top-1/2 -translate-y-1/2">{icon}</div>}
        </div>
    );
};
