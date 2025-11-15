import { useState } from "react";

type Props = {
  projectId: number;
  canManageProject: boolean;
};

export default function SprintsTab({ projectId, canManageProject }: Props) {
  return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      Em desenvolvimento...
    </div>
  );
}