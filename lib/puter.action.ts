import puter from "@heyputer/puter.js";
import { getOrCreateHostingConfig, uploadImageToHosting } from "./puter.hosting";
import { isHostedUrl } from "./utils";
import { PUTER_WORKER_URL } from "./constants";

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
  if (!PUTER_WORKER_URL) {
    console.error(
      "Missing VITE_PUTER_WORKER_URL. Project save endpoint is not configured.",
    );
    return null;
  }

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

  const payload = {
    ...rest,
    sourceImage: resolvedSource,
    renderedImage: resolvedRender,
  };
  try {
    const response = await puter.workers.exec(
      `${PUTER_WORKER_URL}/api/projects/save`,
      {
        method: "POST",
        body: JSON.stringify({
          project: payload,
          visibility,
        }),
      },
    );

    if (!response.ok) {
      console.error("failed to save the project", await response.text());
      return null;
    }

    const data = (await response.json()) as { project?: DesignItem | null };

    return data?.project ?? null;
  } catch (e) {
    console.log("Failed to save project", e);
    return null;
  }
};
