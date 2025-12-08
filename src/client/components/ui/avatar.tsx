import React from "react";

export const Avatar: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...rest }) => {
  return (
    <div className={className ?? "avatar"} {...rest}>
      {children}
    </div>
  );
};

export const AvatarImage: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = (props) => {
  const { alt, ...rest } = props;
  return <img alt={alt} {...rest} />;
};

export const AvatarFallback: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...rest }) => {
  return (
    <div className={className ?? "avatar-fallback"} {...rest}>
      {children}
    </div>
  );
};


