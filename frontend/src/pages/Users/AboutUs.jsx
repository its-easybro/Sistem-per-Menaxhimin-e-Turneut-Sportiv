import React from "react";
import { motion } from "framer-motion";
import { TeamCard } from "../../components/TeamCard";
import AlbionImg from "../../assets/team/Albion.png";
import AmirImg from "../../assets/team/Amir.png";
import ErikImg from "../../assets/team/Erik.png";
import ErmirImg from "../../assets/team/Ermir.png";

// Variants for staggered animations of sections and items
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2, // Delay between the animation of each child element
    },
  },
};

const itemLeftVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, type: "spring", stiffness: 100 },
  },
};

const AboutUs = () => {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');
        * { font-family: 'Poppins', sans-serif; }
      `}</style>

      <div className="bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="pt-10"
        >
          <h1 className="text-3xl font-semibold text-center mx-auto">
            About us
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2 max-w-md mx-auto">
            This Sports Tournament Management System was created to facilitate
            the organization and smooth running of sports activities.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8 px-4 md:px-0 py-10">
          <motion.img
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-sm w-full rounded-xl h-auto ring-1 ring-black/5 dark:ring-white/10"
            src="https://images.unsplash.com/photo-1555212697-194d092e3b8f?q=80&w=830&h=844&auto=format&fit=crop"
            alt="Sports"
          />

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-slate-100">
              Core Features
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Provides an exceptional experience for organizers, players, and
              referees with advanced features.
            </p>

            <div className="flex flex-col gap-10 mt-6">
              {[
                {
                  title: "Effective Management",
                  desc: "The registration of teams and the organization of matches is done with ease and speed.",
                  img: "flashEmoji.png",
                },
                {
                  title: "Statistics and Results",
                  desc: "Track results in real-time and update the tournament standings.",
                  img: "colorsEmoji.png",
                },
                {
                  title: "Full Administration Panel",
                  desc: "Complete control over sports, referees, and user roles within the platform.",
                  img: "puzzelEmoji.png",
                },
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  variants={itemLeftVariants}
                  className="flex items-center gap-4"
                >
                  <div className="size-9 p-2 bg-indigo-50 border border-indigo-200 rounded dark:bg-indigo-500/10 dark:border-indigo-400/20">
                    <img
                      src={`https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/aboutSection/${feature.img}`}
                      alt=""
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-slate-600 dark:text-slate-200">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {feature.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-col items-center text-center gap-3 py-16"
        >
          <h1 className="text-3xl md:text-4xl font-semibold mb-4 text-gray-800 dark:text-slate-100">
            Meet the Team
          </h1>
          <p className="w-3/5 mb-14 text-gray-500 dark:text-slate-400 text-sm">
            Discover the people behind this project who made its realization
            possible and provide the right solutions for the platform.
          </p>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="flex flex-wrap gap-8 items-center justify-center"
          >
            {[
              {
                img: AlbionImg,
                name: "Albion Hakiu",
                role: "Developer",
                desc: "Lead developer and system architect.",
                url: "https://www.linkedin.com/in/albion-hakiu-4501b1357/",
              },
              {
                img: AmirImg,
                name: "Amir Bejta",
                role: "Developer",
                desc: "Responsible for interface and user experience.",
                url: "https://www.linkedin.com/in/amir-bejta-1491b6387/",
              },
              {
                img: ErikImg,
                name: "Erik Jashari",
                role: "Developer",
                desc: "Backend developer and database specialist.",
                url: "https://www.linkedin.com/in/eriki-jashari-204752354/",
              },
              {
                img: ErmirImg,
                name: "Ermir Krosa",
                role: "Developer",
                desc: "Project manager and support for the team.",
                url: "https://www.linkedin.com/in/ermir-krosa/",
              },
            ].map((member, index) => (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover={{ y: -10, transition: { duration: 0.2 } }}
              >
                <TeamCard
                  image={member.img}
                  name={member.name}
                  role={member.role}
                  description={member.desc}
                  linkedinUrl={member.url}
                />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </>
  );
};

export default AboutUs;
