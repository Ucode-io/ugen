import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientTypeApi } from "../api/client-type-api";
import { CreateClientTypePayload, UpdateClientTypePayload } from "../model/types";

export const useClientTypes = (projectId?: string) => {
  return useQuery({
    queryKey: ["client-types", projectId],
    queryFn: () => clientTypeApi.getClientTypes(projectId!),
    enabled: !!projectId,
  });
};

export const useCreateClientType = (projectId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateClientTypePayload) => 
      clientTypeApi.createClientType(projectId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-types", projectId] });
    },
  });
};

export const useUpdateClientType = (projectId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateClientTypePayload) => 
      clientTypeApi.updateClientType(projectId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-types", projectId] });
    },
  });
};
