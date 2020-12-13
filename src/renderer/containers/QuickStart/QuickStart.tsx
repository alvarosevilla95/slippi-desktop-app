import firebase from "firebase";
import React from "react";
import { useHistory } from "react-router-dom";

import { StepperDots } from "@/components/StepperDots";
import { LoginForm } from "@/containers/LoginForm";
import { Setting, useSetting } from "@/lib/hooks/useSetting";
import { ISOFileSelector } from "../ISOFileSelector";

enum QuickStartStep {
  LOGIN = "LOGIN",
  SET_ISO_PATH = "SET_ISO_PATH",
  COMPLETE = "COMPLETE",
}

function generateSteps(
  user: firebase.User | null,
  isoPath: string | null
): QuickStartStep[] {
  const steps: QuickStartStep[] = [];
  if (!user) {
    steps.push(QuickStartStep.LOGIN);
  }
  if (!isoPath) {
    steps.push(QuickStartStep.SET_ISO_PATH);
  }

  steps.push(QuickStartStep.COMPLETE);
  return steps;
}

export const QuickStart: React.FC<{
  user: firebase.User | null;
}> = ({ user }) => {
  const [isoPath, setIsoPath] = useSetting<string>(Setting.ISO_PATH);
  const history = useHistory();
  // We only want to generate the steps list once so use a React state
  const [steps] = React.useState(generateSteps(user, isoPath));
  const [currentStep, setCurrentStep] = React.useState<QuickStartStep | null>(
    null
  );

  const getStepContent = (step: QuickStartStep | null) => {
    switch (step) {
      case QuickStartStep.LOGIN:
        return <LoginForm />;
      case QuickStartStep.SET_ISO_PATH:
        return (
          <ISOFileSelector
            handlePathSelection={(isoPath) => setIsoPath(isoPath)}
          />
        );
      case QuickStartStep.COMPLETE:
        return (
          <div>
            you're done!{" "}
            <button onClick={() => history.push("/home")}>continue</button>
          </div>
        );
      default:
        return null;
    }
  };

  React.useEffect(() => {
    // If we only have the complete step then just go home
    if (steps.length === 1 && steps[0] === QuickStartStep.COMPLETE) {
      history.push("/home");
      return;
    }

    let stepToShow: QuickStartStep | null = QuickStartStep.COMPLETE;
    if (!isoPath) {
      stepToShow = QuickStartStep.SET_ISO_PATH;
    }

    if (!user) {
      stepToShow = QuickStartStep.LOGIN;
    }
    setCurrentStep(stepToShow);
  }, [user, isoPath]);

  if (currentStep === null) {
    return null;
  }

  return (
    <div>
      <div>{getStepContent(currentStep)}</div>
      <StepperDots
        steps={steps.length}
        activeStep={steps.indexOf(currentStep)}
      />
    </div>
  );
};