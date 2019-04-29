export const name =  "ims/compute";

export async function run(conf) {
    //compute misc variables used by multiple other modules and store them back in conf.
  
    var base = `https://www.imsglobal.org/spec/${conf.shortName}/`
  
    //v1p2-style reformat for use in path segments
    conf.versionURL = `v${conf.specVersion}`.replace('.', 'p');
        
    conf.thisURL = `${base}${conf.versionURL}/`;
    
    conf.errataURL = `${conf.thisURL}errata/`;
    
    if(conf.specType !== "spec") {
      conf.thisURL = `${conf.thisURL}${conf.specType}/`;                    
    }
            
    conf.latestURI = `${base}latest/`;
    if(conf.specType !== "spec") {
      conf.latestURI = `${conf.latestURI}${conf.specType}/`;                    
    }
    
    //needed for aux docs that need to point back to main spec
    conf.mainSpecURL = `${base}${conf.versionURL}/`;
}