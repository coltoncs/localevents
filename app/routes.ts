import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("map", "routes/map.tsx"),
  route("events", "routes/events.tsx"),
  route("events/:id", "routes/events.$id.tsx"),
  route("events/:id/edit", "routes/events.$id.edit.tsx"),
  route("events/:id/delete", "routes/events.$id.delete.tsx"),
  route("submit", "routes/submit.tsx"),
  route("my-events", "routes/my-events.tsx"),
  route("apply-author", "routes/apply-author.tsx"),
  route("become-author", "routes/become-author.tsx"),
  route("admin", "routes/admin.tsx"),
  route("api/vote", "routes/api.vote.tsx"),
  route("api/cron/cleanup", "routes/api.cron.cleanup.tsx"),
  route("api/upload", "routes/api.upload.tsx"),
  route("api/delete-image", "routes/api.delete-image.tsx"),
] satisfies RouteConfig;
