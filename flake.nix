{
  description = "Development environment for @akoenig/effective";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22 # Node.js 22 is the current LTS
            git
          ];

          shellHook = ''
            echo "Development environment loaded!"
            echo "Node.js version: $(node --version)"
            
            # Enable corepack for pnpm
            corepack enable
            corepack prepare pnpm@latest --activate
            echo "pnpm version: $(pnpm --version)"
          '';
        };
      });
}