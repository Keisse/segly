import { useParams } from "react-router-dom";
import LeadDetail from "./LeadDetail";
import { LeadStageInformation } from "@/components/admin/LeadStageInformation";

const LeadDetailEnhanced = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <>
      <LeadDetail />
      {id && (
        <div className="px-4 pb-6">
          <div className="max-w-5xl mx-auto">
            <LeadStageInformation leadId={id} />
          </div>
        </div>
      )}
    </>
  );
};

export default LeadDetailEnhanced;
