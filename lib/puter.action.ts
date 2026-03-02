import puter from "@heyputer/puter.js";
import { getOrCreateHostingConfig, uploadImageToHosting } from "./puter.hosting";
import { isHostedUrl } from "./utils";

const PROJECTS_KV_KEY = "roomify_projects";

export const signIn = async () => puter.auth.signIn();

export const signOut = () => puter.auth.signOut();

export const getCurrentUser = async () => {
  try {
    return await puter.auth.getUser();
  } catch {
    return null;
  }
};

export const createProject = async ({
  item,
  visibility = "private",
}: CreateProjectParams): Promise<DesignItem | null | undefined> => {
  const projectId = item.id;
  const hosting = await getOrCreateHostingConfig();

  const hostedSource = projectId
    ? await uploadImageToHosting({
        hosting,
        url: item.sourceImage,
        projectId,
        label: "source",
      })
    : null;

  const hostedRender =
    projectId && item.renderedImage
      ? await uploadImageToHosting({
          hosting,
          url: item.renderedImage,
          projectId,
          label: "rendered",
        })
      : null;

  const resolvedSource =
    hostedSource?.url ||
    (isHostedUrl(item.sourceImage) ? item.sourceImage : "");

  if (!resolvedSource) {
    console.warn("Failed to host source image, skipping save.");
    return null;
  }

  const resolvedRender = hostedRender?.url
    ? hostedRender?.url
    : item.renderedImage && isHostedUrl(item.renderedImage)
      ? item.renderedImage
      : undefined;

  const {
    sourcePath: _sourcePath,
    renderedPath: _renderedPath,
    publicPath: _publicPath,
    ...rest
  } = item;

  const project: DesignItem = {
    ...rest,
    sourceImage: resolvedSource,
    renderedImage: resolvedRender,
    isPublic: visibility === "public",
  };

  try {
    // Load existing projects from kv store
    const existing = (await puter.kv.get(PROJECTS_KV_KEY)) as DesignItem[] | null;
    const projects: DesignItem[] = Array.isArray(existing) ? existing : [];

    // Replace or insert project
    const idx = projects.findIndex((p) => p.id === project.id);
    if (idx >= 0) {
      projects[idx] = project;
    } else {
      projects.unshift(project);
    }

    await puter.kv.set(PROJECTS_KV_KEY, projects);

    return project;
  } catch (e) {
    console.error("Failed to save project to kv store", e);
    return null;
  }
};

export const getProjectById = async (
  id: string,
): Promise<DesignItem | null> => {
  try {
    const existing = (await puter.kv.get(PROJECTS_KV_KEY)) as DesignItem[] | null;
    const projects: DesignItem[] = Array.isArray(existing) ? existing : [];
    return projects.find((project) => project.id === id) ?? null;
  } catch (e) {
    console.error("Failed to read project from kv store", e);
    return null;
  }
};
