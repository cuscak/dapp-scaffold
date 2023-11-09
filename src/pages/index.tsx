import type { NextPage } from "next";
import Head from "next/head";
import { HomeView } from "../views";

const Home: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>Wisdom of the Crowd</title>
        <meta
          name="description"
          content="Wisdom of the Crowd"
        />
      </Head>
      <HomeView />
    </div>
  );
};

export default Home;
