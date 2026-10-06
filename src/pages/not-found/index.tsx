import { Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import Header from "@/shared/layout/Header";

export default function NotFound() {
	return (
		<div className="page">
			<Header heading="Page not found" />
			<EmptyState
				icon={Compass}
				title="We couldn't find that page"
				description="The link may be out of date. Head back to your dashboard to keep going."
			>
				<Link to="/" className={buttonVariants()}>
					Go to dashboard
				</Link>
			</EmptyState>
		</div>
	);
}
