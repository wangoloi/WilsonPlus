module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Disable CSS minimization by removing the CSS minimizer plugin
      if (webpackConfig.optimization && webpackConfig.optimization.minimizer) {
        webpackConfig.optimization.minimizer = webpackConfig.optimization.minimizer.filter(
          (minimizer) => {
            // Remove CSS minimizer plugin
            if (minimizer.constructor.name.includes('CssMinimizer')) {
              return false;
            }
            return true;
          }
        );
      }
      
      // Also try to disable CSS optimization
      if (webpackConfig.optimization) {
        webpackConfig.optimization.minimize = false;
      }
      
      return webpackConfig;
    }
  }
};
