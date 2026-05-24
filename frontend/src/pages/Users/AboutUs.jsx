import React from "react";
import { TeamCard } from "../../components/TeamCard";
import AlbionImg from "../../assets/team/Albion.png";
import AmirImg from "../../assets/team/Amir.png";
import ErikImg from "../../assets/team/Erik.png";
import ErmirImg from "../../assets/team/Ermir.png";

const AboutUs = () => {
  return (
    <>
      {/* Loads Poppins font styling for this page section. */}
      <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');
            
                * {
                    font-family: 'Poppins', sans-serif;
                }
            `}</style>
      {/* Intro heading and short project mission statement. */}
      <div className="bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100">
      <h1 className="text-3xl font-semibold text-center mx-auto">About us</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2 max-w-md mx-auto">
        This Sports Tournament Management System was created to facilitate the organization and smooth running of sports activities.
      </p>
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8 px-4 md:px-0 py-10">
        <img
          className="max-w-sm w-full rounded-xl h-auto ring-1 ring-black/5 dark:ring-white/10"
          src="https://images.unsplash.com/photo-1555212697-194d092e3b8f?q=80&w=830&h=844&auto=format&fit=crop"
          alt=""
        />
        <div>
          {/* Highlights the platform's core capabilities. */}
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-slate-100">Core Features</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Provides an exceptional experience for organizers, players, and referees with advanced features.
          </p>

          <div className="flex flex-col gap-10 mt-6">
            <div className="flex items-center gap-4">
              <div className="size-9 p-2 bg-indigo-50 border border-indigo-200 rounded dark:bg-indigo-500/10 dark:border-indigo-400/20">
                <img src="https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/aboutSection/flashEmoji.png" alt="" />
              </div>
              <div>
                <h3 className="text-base font-medium text-slate-600 dark:text-slate-200">Effective Management</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">The registration of teams and the organization of matches is done with ease and speed.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="size-9 p-2 bg-indigo-50 border border-indigo-200 rounded dark:bg-indigo-500/10 dark:border-indigo-400/20">
                <img src="https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/aboutSection/colorsEmoji.png" alt="" />
              </div>
              <div>
                <h3 className="text-base font-medium text-slate-600 dark:text-slate-200">Statistics and Results</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Track results in real-time and update the tournament standings.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="size-9 p-2 bg-indigo-50 border border-indigo-200 rounded dark:bg-indigo-500/10 dark:border-indigo-400/20">
                <img src="https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/aboutSection/puzzelEmoji.png" alt="" />
              </div>
              <div>
                <h3 className="text-base font-medium text-slate-600 dark:text-slate-200">Full Administration Panel</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Complete control over sports, referees, and user roles within the platform.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Team member cards with roles and profile links. */}
      <div className="flex flex-col items-center text-center gap-3 py-8">
        <h1 className="text-3xl md:text-4xl font-semibold mb-4 text-gray-800 dark:text-slate-100">
          Meet the Team
        </h1>
        <p className="w-3/5 mb-14 text-gray-500 dark:text-slate-400 text-sm">
          Discover the people behind this project who made its realization possible and provide the right solutions for the platform.
        </p>
        <div className="flex flex-wrap gap-8 items-center justify-center">
          <TeamCard
            image={AlbionImg}
            name="Albion Hakiu"
            role="Developer"
            description="Lead developer and system architect."
            linkedinUrl="https://www.linkedin.com/in/albion-hakiu-4501b1357/"
          />

          <TeamCard
            image={AmirImg}
            name="Amir Bejta"
            role="Developer"
            description="Responsible for interface and user experience."
            linkedinUrl="https://www.linkedin.com/in/amir-bejta-1491b6387/"
          />

          <TeamCard
            image={ErikImg}
            name="Erik Jashari"
            role="Developer"
            description="Backend developer and database specialist."
            linkedinUrl="https://www.linkedin.com/in/eriki-jashari-204752354/"
          />

          <TeamCard
            image={ErmirImg}
            name="Ermir Krosa"
            role="Developer"
            description="Project manager and support for the team."
            linkedinUrl="https://www.linkedin.com/in/ermir-krosa/"
          />
        </div>
      </div>
      </div>
    </>
  );
};

export default AboutUs;
