import { useState, useEffect } from "react";
import type {
  SwaggerSpec,
  EndpointGroup,
  EndpointInfo,
} from "../types/swagger";
import { InfrastructureAPI } from "../services/api";

interface UseSwaggerDataResult {
  spec: SwaggerSpec | null;
  groupedEndpoints: EndpointGroup[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Group endpoints by their tags
 */
function groupEndpointsByTag(spec: SwaggerSpec | null): EndpointGroup[] {
  if (!spec?.paths) return [];

  const groups = new Map<string, EndpointGroup>();

  // Initialize groups from tags
  spec.tags?.forEach((tag) => {
    groups.set(tag.name, {
      tag: tag.name,
      description: tag.description,
      endpoints: [],
    });
  });

  // Process each path
  Object.entries(spec.paths).forEach(([path, pathItem]) => {
    const methods: Array<"get" | "post" | "put" | "delete" | "patch"> = [
      "get",
      "post",
      "put",
      "delete",
      "patch",
    ];

    methods.forEach((method) => {
      const operation = pathItem[method];
      if (!operation) return;

      const tags = operation.tags || ["Untagged"];

      tags.forEach((tag) => {
        if (!groups.has(tag)) {
          groups.set(tag, {
            tag,
            endpoints: [],
          });
        }

        const endpoint: EndpointInfo = {
          method: method.toUpperCase() as EndpointInfo["method"],
          path,
          operationId: operation.operationId,
          summary: operation.summary,
          operation,
        };

        groups.get(tag)!.endpoints.push(endpoint);
      });
    });
  });

  // Sort groups alphabetically and endpoints by path
  return Array.from(groups.values())
    .sort((a, b) => a.tag.localeCompare(b.tag))
    .map((group) => ({
      ...group,
      endpoints: group.endpoints.sort((a, b) => a.path.localeCompare(b.path)),
    }));
}

export function useSwaggerData(): UseSwaggerDataResult {
  const [spec, setSpec] = useState<SwaggerSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await InfrastructureAPI.getSwaggerSpec();
      setSpec(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch Swagger spec",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const groupedEndpoints = groupEndpointsByTag(spec);

  return {
    spec,
    groupedEndpoints,
    loading,
    error,
    refresh: fetchData,
  };
}

export default useSwaggerData;
