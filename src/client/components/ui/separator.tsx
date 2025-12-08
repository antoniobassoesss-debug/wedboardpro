import React from "react";

export const Separator: React.FC<React.HTMLAttributes<HTMLHRElement>> = ({ className, ...rest }) => {
  return <hr className={className ?? "separator"} {...rest} />;
};


