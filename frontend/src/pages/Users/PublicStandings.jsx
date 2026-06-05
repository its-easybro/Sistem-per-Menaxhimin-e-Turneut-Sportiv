import Standings from "../admin/Standings";

// Public view of the standings page, which simply renders the existing Standings component with a prop to indicate it's being viewed in a public context, allowing for any necessary adjustments in how the standings are displayed to non-admin users.
export default function PublicStandings() {
  return <Standings publicView />;
}
