import React from "react";
import AlbionImg from "../../assets/team/Albion.png";
import ErikImg from "../../assets/team/Erik.png";

const AboutUs = () => {
  return (
    <div className="flex flex-col items-center text-center">
      <h3 className="text-lg font-medium text-blue-600 mb-2">Contact Us</h3>
      <h1 className="text-3xl md:text-4xl font-semibold mb-4 text-gray-800">
        Meet Our People
      </h1>
      <p className="w-3/5 mb-14 text-gray-500 text-sm">
        Lorem Ipsum is simply dummy text of the printing and typesetting
        industry. Lorem Ipsum has been the industry's standard dummy text.
      </p>
      <div className="flex flex-wrap gap-6 items-center justify-center">
        <div className="group flex flex-col items-center py-8 text-sm bg-white border border-gray-300/60 w-64 rounded-md cursor-pointer hover:border-blue-600 hover:bg-blue-600 transition">
          <img
            className="w-24 rounded-full"
            src={AlbionImg}
            alt="Albion IMG HERE"
          />
          <h2 className="text-gray-700 group-hover:text-white text-lg font-medium mt-2">
            Albion Hakiu
          </h2>
          <p className="text-gray-500 group-hover:text-white/80">Role here</p>
          <p className="text-center text-gray-500/60 group-hover:text-white/60 w-3/4 mt-4">
            Lorem Ipsum is simply dummy text of the printing
          </p>
          <div className="flex items-center space-x-4 mt-6 text-gray-500 group-hover:text-white">
            <a
              href="https://www.linkedin.com/in/albion-hakiu-4501b1357/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M14.882 0H1.167A1.16 1.16 0 0 0 0 1.161V14.84C0 15.459.519 16 1.167 16H14.83a1.16 1.16 0 0 0 1.166-1.161V1.135C16.048.516 15.53 0 14.882 0M4.744 13.6H2.385V5.987h2.36zM3.552 4.929c-.778 0-1.374-.62-1.374-1.368a1.38 1.38 0 0 1 1.374-1.367 1.38 1.38 0 0 1 1.374 1.367c0 .749-.57 1.368-1.374 1.368M11.33 13.6V9.91c0-.878-.026-2.039-1.245-2.039-1.244 0-1.426.98-1.426 1.961V13.6H6.3V5.987h2.307v1.058h.026c.337-.62 1.09-1.239 2.256-1.239 2.411 0 2.852 1.549 2.852 3.665V13.6z"
                  fill="currentColor"
                />
              </svg>
            </a>
          </div>
        </div>

        <div className="group flex flex-col items-center py-8 text-sm bg-white border border-gray-300/60 w-64 rounded-md cursor-pointer hover:border-blue-600 hover:bg-blue-600 transition">
          <img 
            className="w-24 rounded-full" 
            src="" 
            alt="Amir IMG HERE" 
          />
          <h2 className="text-gray-700 group-hover:text-white text-lg font-medium mt-2">
            Amir Bejta
          </h2>
          <p className="text-gray-500 group-hover:text-white/80">Role here</p>
          <p className="text-center text-gray-500/60 group-hover:text-white/60 w-3/4 mt-4">
            Lorem Ipsum is simply dummy text of the printing
          </p>
          <div className="flex items-center space-x-4 mt-6 text-gray-500 group-hover:text-white">
            <a
              href="https://www.linkedin.com/in/amir-bejta-1491b6387/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns=""
              >
                <path
                  d="M14.882 0H1.167A1.16 1.16 0 0 0 0 1.161V14.84C0 15.459.519 16 1.167 16H14.83a1.16 1.16 0 0 0 1.166-1.161V1.135C16.048.516 15.53 0 14.882 0M4.744 13.6H2.385V5.987h2.36zM3.552 4.929c-.778 0-1.374-.62-1.374-1.368a1.38 1.38 0 0 1 1.374-1.367 1.38 1.38 0 0 1 1.374 1.367c0 .749-.57 1.368-1.374 1.368M11.33 13.6V9.91c0-.878-.026-2.039-1.245-2.039-1.244 0-1.426.98-1.426 1.961V13.6H6.3V5.987h2.307v1.058h.026c.337-.62 1.09-1.239 2.256-1.239 2.411 0 2.852 1.549 2.852 3.665V13.6z"
                  fill="currentColor"
                />
              </svg>
            </a>
          </div>
        </div>

        <div className="group flex flex-col items-center py-8 text-sm bg-white border border-gray-300/60 w-64 rounded-md cursor-pointer hover:border-blue-600 hover:bg-blue-600 transition">
          <img
            className="w-24 rounded-full"
            src={ErikImg}
            alt="Erik IMG HERE"
          />
          <h2 className="text-gray-700 group-hover:text-white text-lg font-medium mt-2">
            Erik Jashari
          </h2>
          <p className="text-gray-500 group-hover:text-white/80">Role here</p>
          <p className="text-center text-gray-500/60 group-hover:text-white/60 w-3/4 mt-4">
            Lorem Ipsum is simply dummy text of the printing
          </p>
          <div className="flex items-center space-x-4 mt-6 text-gray-500 group-hover:text-white">
            <a
              href="https://www.linkedin.com/in/eriki-jashari-204752354/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M14.882 0H1.167A1.16 1.16 0 0 0 0 1.161V14.84C0 15.459.519 16 1.167 16H14.83a1.16 1.16 0 0 0 1.166-1.161V1.135C16.048.516 15.53 0 14.882 0M4.744 13.6H2.385V5.987h2.36zM3.552 4.929c-.778 0-1.374-.62-1.374-1.368a1.38 1.38 0 0 1 1.374-1.367 1.38 1.38 0 0 1 1.374 1.367c0 .749-.57 1.368-1.374 1.368M11.33 13.6V9.91c0-.878-.026-2.039-1.245-2.039-1.244 0-1.426.98-1.426 1.961V13.6H6.3V5.987h2.307v1.058h.026c.337-.62 1.09-1.239 2.256-1.239 2.411 0 2.852 1.549 2.852 3.665V13.6z"
                  fill="currentColor"
                />
              </svg>
            </a>
          </div>
        </div>

        <div className="group flex flex-col items-center py-8 text-sm bg-white border border-gray-300/60 w-64 rounded-md cursor-pointer hover:border-blue-600 hover:bg-blue-600 transition">
          <img 
            className="w-24 rounded-full" 
            src="" 
            alt="Ermir IMG HERE" />
          <h2 className="text-gray-700 group-hover:text-white text-lg font-medium mt-2">
            Ermir Krosa
          </h2>
          <p className="text-gray-500 group-hover:text-white/80">Role Here</p>
          <p className="text-center text-gray-500/60 group-hover:text-white/60 w-3/4 mt-4">
            Lorem Ipsum is simply dummy text of the printing
          </p>
          <div className="flex items-center space-x-4 mt-6 text-gray-500 group-hover:text-white">
            <a
              href="https://www.linkedin.com/in/ermir-krosa/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M14.882 0H1.167A1.16 1.16 0 0 0 0 1.161V14.84C0 15.459.519 16 1.167 16H14.83a1.16 1.16 0 0 0 1.166-1.161V1.135C16.048.516 15.53 0 14.882 0M4.744 13.6H2.385V5.987h2.36zM3.552 4.929c-.778 0-1.374-.62-1.374-1.368a1.38 1.38 0 0 1 1.374-1.367 1.38 1.38 0 0 1 1.374 1.367c0 .749-.57 1.368-1.374 1.368M11.33 13.6V9.91c0-.878-.026-2.039-1.245-2.039-1.244 0-1.426.98-1.426 1.961V13.6H6.3V5.987h2.307v1.058h.026c.337-.62 1.09-1.239 2.256-1.239 2.411 0 2.852 1.549 2.852 3.665V13.6z"
                  fill="currentColor"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
