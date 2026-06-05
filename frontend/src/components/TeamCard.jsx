import React, { useState, useRef } from "react";

export const TeamCard = ({ image, name, role, description, linkedinUrl }) => {
  // Toggles glow visibility while the cursor is over the card.
  const [visible, setVisible] = useState(false);
  // Stores cursor coordinates relative to the card for glow positioning.
  const [position, setPosition] = useState({ x: 0, y: 0 });
  // References the card container to measure cursor offset bounds.
  const divRef = useRef(null);

  // Repositions the glow effect to follow cursor movement inside the card.
  const handleMouseMove = (e) => {
    if (!divRef.current) return;
    const bounds = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - bounds.left, y: e.clientY - bounds.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      // Shows glow when entering the card area.
      onMouseEnter={() => setVisible(true)}
      // Hides glow when leaving the card area.
      onMouseLeave={() => setVisible(false)}
      className="relative w-64 rounded-xl p-px bg-gray-900 backdrop-blur-md overflow-hidden shadow-lg cursor-pointer"
    >
      {/* Gradient glow effect */}
      <div
        className={`pointer-events-none blur-3xl rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-300 size-60 absolute z-0 transition-opacity duration-500 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        style={{ top: position.y - 120, left: position.x - 120 }}
      />

      {/* Card content */}
      <div className="relative z-10 bg-gray-900/75 p-6 rounded-[11px] flex flex-col items-center justify-center text-center">
        {image && (
          <img
            src={image}
            alt={name}
            className="w-24 h-24 rounded-full shadow-md mb-4 object-cover"
          />
        )}

        <h2 className="text-xl font-bold text-white mb-1">{name}</h2>
        <p className="text-sm text-indigo-500 font-medium mb-3">{role}</p>
        <p className="text-sm text-slate-400 mb-4 px-2 line-clamp-3">
          {description}
        </p>

        {/* Social icons */}
        {linkedinUrl && (
          <div className="flex space-x-4 text-slate-400">
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:-translate-y-0.5 transition"
            >
              <svg
                className="size-6"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M14.882 0H1.167A1.16 1.16 0 0 0 0 1.161V14.84C0 15.459.519 16 1.167 16H14.83a1.16 1.16 0 0 0 1.166-1.161V1.135C16.048.516 15.53 0 14.882 0M4.744 13.6H2.385V5.987h2.36zM3.552 4.929c-.778 0-1.374-.62-1.374-1.368a1.38 1.38 0 0 1 1.374-1.367 1.38 1.38 0 0 1 1.374 1.367c0 .749-.57 1.368-1.374 1.368M11.33 13.6V9.91c0-.878-.026-2.039-1.245-2.039-1.244 0-1.426.98-1.426 1.961V13.6H6.3V5.987h2.307v1.058h.026c.337-.62 1.09-1.239 2.256-1.239 2.411 0 2.852 1.549 2.852 3.665V13.6z"
                  fill="currentColor"
                />
              </svg>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
