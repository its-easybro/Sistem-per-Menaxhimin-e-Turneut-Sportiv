import React from "react";
import { TeamCard } from "../../components/TeamCard";
import AlbionImg from "../../assets/team/Albion.png";
import ErikImg from "../../assets/team/Erik.png";

const AboutUs = () => {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-8">
      <h3 className="text-lg font-medium text-blue-600 mb-2">Contact Us</h3>
      <h1 className="text-3xl md:text-4xl font-semibold mb-4 text-gray-800">
        Meet Our People
      </h1>
      <p className="w-3/5 mb-14 text-gray-500 text-sm">
        Lorem Ipsum is simply dummy text of the printing and typesetting
        industry. Lorem Ipsum has been the industry's standard dummy text.
      </p>
      <div className="flex flex-wrap gap-8 items-center justify-center">
        <TeamCard
          image={AlbionImg}
          name="Albion Hakiu"
          role="Role here"
          description="Lorem Ipsum is simply dummy text of the printing"
          linkedinUrl="https://www.linkedin.com/in/albion-hakiu-4501b1357/"
        />

        <TeamCard
          image=""
          name="Amir Bejta"
          role="Role here"
          description="Lorem Ipsum is simply dummy text of the printing"
          linkedinUrl="https://www.linkedin.com/in/amir-bejta-1491b6387/"
        />

        <TeamCard
          image={ErikImg}
          name="Erik Jashari"
          role="Role here"
          description="Lorem Ipsum is simply dummy text of the printing"
          linkedinUrl="https://www.linkedin.com/in/eriki-jashari-204752354/"
        />

        <TeamCard
          image=""
          name="Ermir Krosa"
          role="Role Here"
          description="Lorem Ipsum is simply dummy text of the printing"
          linkedinUrl="https://www.linkedin.com/in/ermir-krosa/"
        />
      </div>
    </div>
  );
};

export default AboutUs;
