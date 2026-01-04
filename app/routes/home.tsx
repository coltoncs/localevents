import type { Route } from "./+types/home";
import { Splash } from "~/splash";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "919 Events" },
    { name: "description", content: "Events in and around the 919 area code" },
  ];
}

export default function Home() {
  return <Splash />;
}
