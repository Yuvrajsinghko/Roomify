import { getProjectById } from "lib/puter.action";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router";

const VisualizerId = () => {
  const { id } = useParams();
  const location = useLocation();
  const state = (location.state || {}) as Partial<
    DesignItem & {
      initialImage?: string;
      initialRender?: string | null;
      initialRendered?: string | null;
    }
  >;

  const initialProject = useMemo<DesignItem | null>(() => {
    const sourceImage = state.initialImage || state.sourceImage;
    if (!id || !sourceImage) return null;

    return {
      id,
      name: state.name || null,
      sourceImage,
      renderedImage:
        state.initialRender || state.initialRendered || state.renderedImage || null,
      timestamp: state.timestamp || Date.now(),
    };
  }, [id, state.initialImage, state.initialRender, state.initialRendered, state.name, state.renderedImage, state.sourceImage, state.timestamp]);

  const [project, setProject] = useState<DesignItem | null>(initialProject);
  const [isLoading, setIsLoading] = useState<boolean>(!initialProject && !!id);

  useEffect(() => {
    let mounted = true;

    const loadProject = async () => {
      if (project || !id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const fetched = await getProjectById(id);
      if (mounted) {
        setProject(fetched);
        setIsLoading(false);
      }
    };

    loadProject();

    return () => {
      mounted = false;
    };
  }, [id, project]);

  if (isLoading) {
    return <section>Loading project...</section>;
  }

  if (!project) {
    return <section>Project not found.</section>;
  }

  return (
    <section>
      <h1>{project.name || "Untitled Project"}</h1>
      <div className="visualizer">
        {project.sourceImage && (
          <div className="image-container">
            <h2>Source Image</h2>
            <img src={project.sourceImage} alt="source" />
          </div>
        )}
        {project.renderedImage && (
          <div className="image-container">
            <h2>Rendered Image</h2>
            <img src={project.renderedImage} alt="rendered" />
          </div>
        )}
      </div>
    </section>
  );
};

export default VisualizerId;
